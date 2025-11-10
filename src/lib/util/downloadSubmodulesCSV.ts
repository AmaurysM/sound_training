import { ISignature, IUserSubmodule, Roles } from "@/models/types";
import { generateHash } from "./generateHash";

export const downloadSubmodulesCSV = async (
    submodules: IUserSubmodule[],
    filename: string,
    getSignatureStatus: (submodule: IUserSubmodule) => { count: number },
    isSubmoduleComplete: (submodule: IUserSubmodule) => boolean
) => {
    if (submodules.length === 0) {
        alert("No data to download");
        return;
    }

    const headers = [
        "Submodule Code",
        "Submodule Title",
        "Submodule Description",
        "Type",
        "OJT Status",
        "Practical Status",
        "Practical Required",
        "Completion Status",
        "Coordinator Signed By",
        "Coordinator Signed At",
        "Trainer Signed By",
        "Trainer Signed At",
        "Student Signed By",
        "Student Signed At",
        "Total Signatures",
        "Verification Hash",
    ];

    const rowPromises = submodules.map(async (submodule) => {
        const signatureStatus = getSignatureStatus(submodule);
        const isComplete = isSubmoduleComplete(submodule);

        const coordSig = submodule.signatures?.find((s) => s.role === Roles.Coordinator);
        const trainerSig = submodule.signatures?.find((s) => s.role === Roles.Trainer);
        const studentSig = submodule.signatures?.find((s) => s.role === Roles.Student);

        const getSignerName = (sig: ISignature | undefined) => {
            if (!sig) return "";
            if (typeof sig.user === "string") return "Unknown User";
            return sig.user.name || sig.user.username || "Unknown User";
        };

        const getSignedDate = (sig: ISignature | undefined) => {
            if (!sig || !sig.createdAt) return "";
            return new Date(sig.createdAt).toLocaleString();
        };

        const rowData = [
            submodule.tSubmodule?.code || "",
            submodule.tSubmodule?.title || "",
            (submodule.tSubmodule?.description || "").replace(/"/g, '""'),
            submodule.tSubmodule?.requiresPractical ? "Practical" : "Theory",
            submodule.ojt ? "Completed" : "Pending",
            submodule.tSubmodule?.requiresPractical
                ? submodule.practical ? "Completed" : "Pending"
                : "N/A",
            submodule.tSubmodule?.requiresPractical ? "Yes" : "No",
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

        return [...rowData, hash];
    });

    const rows = await Promise.all(rowPromises);

    const csvContent = [
        headers.map((h) => `"${h}"`).join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
