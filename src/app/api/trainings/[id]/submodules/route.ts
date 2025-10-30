// src/app/api/trainings/[id]/submodules/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import TrainingSubmodule from "@/models/TrainingSubModule";
import  Signature from "@/models/Signature";
export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    // Fetch all submodules for this module
    const submodules = await TrainingSubmodule.find({ moduleId: id })
      .populate({
        path: "signatures",
        model: "Signature",
        select: "userId userName role signedAt",
      })
      .lean();

      //console.log(submodules)

    if (!submodules || submodules.length === 0) {
      return NextResponse.json({ error: "No submodules found" }, { status: 404 });
    }

    return NextResponse.json(submodules);
  } catch (err) {
    console.error("Error fetching submodules:", err);
    return NextResponse.json(
      { error: "Error fetching submodules" },
      { status: 500 }
    );
  }
}


// // PATCH - update a specific submodule
// export async function PATCH(
//   req: Request,
//   context: { params: Promise<{ id: string; submoduleId: string }> }
// ) {
//   try {
//     await connectToDatabase();
//     const { id, submoduleId } = await context.params;
//     const updates = await req.json();

//     // Verify the training exists
//     const training = await Training.findById(id);
//     if (!training) {
//       return NextResponse.json({ error: "Training not found" }, { status: 404 });
//     }

//     // Find and update the submodule
//     const submodule = await TrainingSubmodule.findById(submoduleId);
//     if (!submodule) {
//       return NextResponse.json({ error: "Submodule not found" }, { status: 404 });
//     }

//     // Apply updates to allowed fields
//     if (updates.ojt !== undefined) submodule.ojt = updates.ojt;
//     if (updates.practical !== undefined) submodule.practical = updates.practical;
//     if (updates.signedOff !== undefined) submodule.signedOff = updates.signedOff;
//     if (updates.signatures !== undefined) submodule.signatures = updates.signatures;

//     // If ojt or practical is being turned off, clear signatures and signedOff
//     if (updates.ojt === false || updates.practical === false) {
//       submodule.signedOff = false;
//       submodule.signatures = [];
//     }

//     await submodule.save();

//     // Return the full training with populated module and submodules
//     const updatedTraining = await Training.findById(id)
//       .populate("user", "name username role")
//       .populate({
//         path: "module",
//         select: "name description submodules",
//         populate: {
//           path: "submodules",
//           model: "TrainingSubModule",
//           select: "title code description requiresPractical practical ojt signedOff signatures",
//           populate: {
//             path: "signatures",
//             model: "Signature",
//             select: "userId userName role signedAt",
//           },
//         },
//       })
//       .lean();

//     return NextResponse.json(updatedTraining);
//   } catch (err) {
//     console.error("Update error:", err);
//     return NextResponse.json(
//       {
//         error: "Update failed",
//         details: err instanceof Error ? err.message : "Unknown error",
//       },
//       { status: 400 }
//     );
//   }
// }

// // DELETE - delete a specific submodule
// export async function DELETE(
//   _: Request,
//   context: { params: Promise<{ id: string; submoduleId: string }> }
// ) {
//   try {
//     await connectToDatabase();
//     const { id, submoduleId } = await context.params;

//     // Verify the training exists
//     const training = await Training.findById(id);
//     if (!training) {
//       return NextResponse.json({ error: "Training not found" }, { status: 404 });
//     }

//     // Delete the submodule
//     const result = await TrainingSubmodule.findByIdAndDelete(submoduleId);
//     if (!result) {
//       return NextResponse.json({ error: "Submodule not found" }, { status: 404 });
//     }

//     return NextResponse.json({ message: "Submodule deleted successfully" });
//   } catch (err) {
//     console.error("Delete error:", err);
//     return NextResponse.json(
//       { error: "Delete failed" },
//       { status: 500 }
//     );
//   }
// }