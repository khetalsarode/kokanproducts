import type { Address } from "@/types";

export const defaultAddresses: Address[] = [
  {
    id: "addr-1",
    label: "Home",
    name: "Khetal Sarode",
    phone: "98765 43210",
    line1: "14 Palm Grove Society, Linking Road",
    line2: "Near Coastal Market",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400050",
    isDefault: true,
  },
  {
    id: "addr-2",
    label: "Office",
    name: "Khetal Sarode",
    phone: "98765 43210",
    line1: "Workbay 3, Horizon Tech Park",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411057",
  },
];
