"use client";

import FarmWorkspace from "../../components/FarmWorkspace";
import { useWorkspace } from "../WorkspaceShell";

export default function PassportsPage() {
  const { farmId, chooseFarm } = useWorkspace();
  return <FarmWorkspace view="passports" initialFarmId={farmId} onFarmSelected={chooseFarm} />;
}
