// src/utils/downloadSubmodulesExcel.ts
import { ISignature, IUserSubmodule, Roles } from "@/models/types";
import { generateHash } from "./generateHash";
import * as XLSX from "xlsx";

export const downloadSubmodulesExcel = async (
    submodules: IUserSubmodule[],
    filename: string,
    getSignatureStatus: (submodule: IUserSubmodule) => { count: number },
    isSubmoduleComplete: (submodule: IUserSubmodule) => boolean
) => {
    if (submodules.length === 0) {
        alert("No data to download");
        return;
    }

    // Helper functions
    const getSignerName = (sig: ISignature | undefined) => {
        if (!sig) return "Not signed";
        if (typeof sig.user === "string") return "Unknown User";
        return sig.user.name || sig.user.username || "Unknown User";
    };

    const getSignedDate = (sig: ISignature | undefined) => {
        if (!sig || !sig.createdAt) return "-";
        return new Date(sig.createdAt).toLocaleString();
    };

    // Prepare data
    const rowPromises = submodules.map(async (submodule) => {
        const signatureStatus = getSignatureStatus(submodule);
        const isComplete = isSubmoduleComplete(submodule);

        const coordSig = submodule.signatures?.find((s) => s.role === Roles.Coordinator);
        const trainerSig = submodule.signatures?.find((s) => s.role === Roles.Trainer);
        const studentSig = submodule.signatures?.find((s) => s.role === Roles.Student);

        const rowData = {
            "Code": submodule.tSubmodule?.code || "-",
            "Title": submodule.tSubmodule?.title || "-",
            "Description": submodule.tSubmodule?.description || "-",
            "Type": submodule.tSubmodule?.requiresPractical ? "Practical" : "Theory",
            "OJT Status": submodule.ojt ? "Completed" : "Pending",
            "Practical Status": submodule.tSubmodule?.requiresPractical
                ? (submodule.practical ? "Completed" : "Pending")
                : "N/A",
            "Completion Status": isComplete ? "Complete" : "In Progress",
            "Coordinator Name": getSignerName(coordSig),
            "Coordinator Signed Date": getSignedDate(coordSig),
            "Trainer Name": getSignerName(trainerSig),
            "Trainer Signed Date": getSignedDate(trainerSig),
            "Student Name": getSignerName(studentSig),
            "Student Signed Date": getSignedDate(studentSig),
            "Total Signatures": `${signatureStatus.count}/3`,
        };

        // Generate hash for verification
        const hashInput = Object.values(rowData).join("|");
        const hash = await generateHash(hashInput);

        return {
            ...rowData,
            "Verification Hash": hash,
        };
    });

    const data = await Promise.all(rowPromises);

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths for better readability
    worksheet["!cols"] = [
        { wch: 15 },  // Code
        { wch: 30 },  // Title
        { wch: 50 },  // Description
        { wch: 12 },  // Type
        { wch: 15 },  // OJT Status
        { wch: 18 },  // Practical Status
        { wch: 18 },  // Completion Status
        { wch: 25 },  // Coordinator Name
        { wch: 25 },  // Coordinator Date
        { wch: 25 },  // Trainer Name
        { wch: 25 },  // Trainer Date
        { wch: 25 },  // Student Name
        { wch: 25 },  // Student Date
        { wch: 18 },  // Total Signatures
        { wch: 70 },  // Verification Hash
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submodules");

    // Add metadata sheet for verification info
    const metadataSheet = XLSX.utils.json_to_sheet([
        {
            "Report": "Submodules Report",
            "Generated": new Date().toLocaleString(),
            "Total Records": submodules.length,
            "Note": "Verification hashes ensure data integrity"
        }
    ]);
    XLSX.utils.book_append_sheet(workbook, metadataSheet, "Metadata");

    // Download the file
    XLSX.writeFile(workbook, filename.replace(/\.pdf$/, '.xlsx'));
};