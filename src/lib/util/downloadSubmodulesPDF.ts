// src/utils/downloadSubmodulesPDF.ts
import { ISignature, IUserSubmodule, Roles } from "@/models/types";
import { generateHash } from "./generateHash";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const downloadSubmodulesPDF = async (
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

        // Combine status info
        const statusInfo = [
            submodule.ojt ? "OJT✓" : "OJT○",
            submodule.tSubmodule?.requiresPractical 
                ? (submodule.practical ? "Prac✓" : "Prac○")
                : ""
        ].filter(Boolean).join(" ");

        const rowData = [
            submodule.tSubmodule?.code || "-",
            submodule.tSubmodule?.title || "-",
            submodule.tSubmodule?.requiresPractical ? "Practical" : "Theory",
            statusInfo,
            isComplete ? "Complete" : "In Progress",
            getSignerName(coordSig),
            getSignedDate(coordSig),
            getSignerName(trainerSig),
            getSignedDate(trainerSig),
            getSignerName(studentSig),
            getSignedDate(studentSig),
            `${signatureStatus.count}/3`,
        ];

        const hashInput = rowData.join("|");
        const hash = await generateHash(hashInput);

        return [...rowData, hash.substring(0, 12) + "..."];
    });

    const tableData = await Promise.all(rowPromises);

    // Initialize PDF
    const doc = new jsPDF({ orientation: "landscape", format: "a4" });
    
    // Title
    doc.setFontSize(16);
    doc.setFont("", "bold");
    doc.text("Submodules Report", doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });
    
    doc.setFontSize(9);
    doc.setFont("", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, doc.internal.pageSize.getWidth() / 2, 22, { align: "center" });

    // Create table with autoTable
    autoTable(doc, {
        startY: 30,
        head: [[
            "Code",
            "Title",
            "Type",
            "Progress",
            "Status",
            "Coordinator",
            "Signed",
            "Trainer",
            "Signed",
            "Student",
            "Signed",
            "Total",
            "Hash"
        ]],
        body: tableData,
        theme: "grid",
        styles: {
            fontSize: 8,
            cellPadding: 2,
            overflow: "linebreak",
            cellWidth: "wrap",
        },
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: "bold",
            halign: "center",
            fontSize: 8,
        },
        columnStyles: {
            0: { cellWidth: 22 }, // Code
            1: { cellWidth: 45 }, // Title
            2: { cellWidth: 20 }, // Type
            3: { cellWidth: 30 }, // Progress (OJT/Practical combined)
            4: { cellWidth: 25 }, // Status
            5: { cellWidth: 30 }, // Coord Signer
            6: { cellWidth: 35 }, // Coord Date
            7: { cellWidth: 30 }, // Trainer Signer
            8: { cellWidth: 35 }, // Trainer Date
            9: { cellWidth: 30 }, // Student Signer
            10: { cellWidth: 35 }, // Student Date
            11: { cellWidth: 15, halign: "center" }, // Signatures count
            12: { cellWidth: 20, fontSize: 6 }, // Hash
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245],
        },
        margin: { top: 30, right: 10, bottom: 10, left: 10 },
    });

    doc.save(filename);
};