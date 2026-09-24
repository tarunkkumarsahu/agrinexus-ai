"use client";

import FarmWorkspace from "../../components/FarmWorkspace";
import { useWorkspace } from "../WorkspaceShell";

export default function FarmRecordsPage() {
  const { farmId, chooseFarm } = useWorkspace();
  return <FarmWorkspace view="farms" initialFarmId={farmId} onFarmSelected={chooseFarm} />;
}
