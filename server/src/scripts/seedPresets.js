// scripts/seedPresets.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Company from "../models/Company.js";
import Client from "../models/Client.js";
import Route from "../models/Route.js";

const fixedCompanyId = "68fdcec5894729457125ee2b"; // 👈 Replace with actual ObjectId string of the company your user points to

const data = [
  {
    name: "Auto Chlor Branch 310",
    address: "971 25th St\nSan Francisco, CA 94107",
    routes: [
      { description: "Auto Chlor Branch 370 (South San Francisco, CA) to Auto Chlor Branch 310 (San Francisco, CA)", price: 100000 },
      { description: "EMPTY TOTES & PLASTIC BOTTLES FROM Auto Chlor Branch 310 (San Francisco, CA) to Auto Chlor Branch 370 (South San Francisco, CA)", price: 40000 },
    ],
  },
  {
    name: "Dart Advantage Logistics",
    address: "EAGAN, MN 55121",
    routes: [
      { description: "Pickup FROM Enviro Tech (Modesto, CA) to GEORGE CHIALA FARMS (Hollister, CA) to True Leaf Farms (San Juan Bautista, CA) to GEORGE CHIALA FARM (Morgan Hill, CA)", price: 115000 },
      { description: "Pickup FROM Enviro Tech (Modesto, CA) to GEORGE CHIALA FARMS (Hollister, CA) to GEORGE CHIALA FARM (Morgan Hill, CA)", price: 115000 },
    ],
  },
  {
    name: "Auto Chlor Branch 350",
    address: "1350 14th St\nOakland, CA 94607",
    routes: [
      { description: "EMPTY TOTES FROM Auto Chlor Branch 350 (Oakland, CA) to Auto Chlor Branch 370 (South San Francisco, CA)", price: 50000 },
      { description: "Auto Chlor Branch 370 (South San Francisco, CA) to Auto Chlor Branch 350 (Oakland, CA)", price: 150000 },
    ],
  },
  {
    name: "BBI Logistics",
    address: "PO BOX 970\nColumbus, OH 43216",
    routes: [
      { description: "RK Logistics(Livermore, CA) to Glacier Warehouse(Lathrop,CA)", price: 35000 },
    ],
  },
  {
    name: "Auto Chlor Branch 330",
    address: "3000 Academy Way Ste 100\nSacramento, CA 95815",
    routes: [
      { description: "Auto Chlor Branch 370 (South San Francisco, CA) to Auto Chlor Branch 330 (Sacramento, CA)", price: null },
    ],
  },
  {
    name: "Auto Chlor Branch 340",
    address: "1985 Arnold Industrial Way\nConcord, CA 94520",
    routes: [
      { description: "Auto Chlor Branch 330 (Sacramento, CA) to Auto Chlor Branch 340 (Concord, CA)", price: 150000 },
      { description: "EMPTY TOTES AND PLASTIC BOTTLES FROM Auto Chlor Branch 340 (Concord, CA) to Auto Chlor Branch 330 (Sacramento, CA)", price: 100000 },
    ],
  },
  {
    name: "Steam Logistics, LLC",
    address: "328 Broad Street\nChattanooga, TN 37402",
    routes: [
      { description: "PICKUP from TRANSHOLD INC (Stockton, CA) to AGRO CULTURE LIQUID FERTILIZERS (Stockton,CA)", price: 45000 },
    ],
  },
  {
    name: "Auto Chlor Branch 360",
    address: "1122 Bessemer Ave STE E\nManteca, CA 95337",
    routes: [
      { description: "EMPTY TOTES FROM Auto Chlor Branch 360 (Manteca, CA) to Auto Chlor Branch 330 (Sacramento, CA)", price: 60000 },
      { description: "Auto Chlor Branch 330 (Sacramento, CA) to Auto Chlor Branch 360 (Manteca, CA)", price: 120000 },
    ],
  },
  {
    name: "Auto Chlor Branch 390",
    address: "27 Maxwell Court\nSanta Rosa, Ca 95401",
    routes: [
      { description: "EMPTY TOTES and EMPTY PLASTIC BOTTLES FROM Auto Chlor Branch 390 (Santa Rosa, CA) to Auto Chlor Branch 370 (South San Francisco, CA)", price: 70000 },
      { description: "Auto Chlor Branch 370 (South San Francisco, CA) to Auto Chlor Branch 390 (Santa Rosa, CA)", price: 120000 },
    ],
  },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const company = await Company.findById(fixedCompanyId);
    if (!company) throw new Error("❌ Company ID not found in DB");

    await Client.deleteMany({ companyId: fixedCompanyId });
    await Route.deleteMany({ companyId: fixedCompanyId });

    for (const preset of data) {
      const client = await Client.findOneAndUpdate(
        { name: preset.name, companyId: fixedCompanyId },
        {
          name: preset.name,
          address: preset.address,
          companyId: fixedCompanyId,
        },
        { upsert: true, new: true }
      );

      for (const route of preset.routes) {
        await Route.findOneAndUpdate(
          { name: route.description, clientId: client._id, companyId: fixedCompanyId },
          {
            name: route.description,
            descriptionTemplate: route.description,
            clientId: client._id,
            companyId: fixedCompanyId,
            prices: route.price
              ? [{ amountCents: route.price, effectiveFrom: new Date() }]
              : [],
          },
          { upsert: true }
        );
      }
    }

    console.log("✅ Resync complete. All clients/routes now match your user's company.");
    process.exit();
  } catch (err) {
    console.error("❌ Error seeding presets:", err);
    process.exit(1);
  }
})();
