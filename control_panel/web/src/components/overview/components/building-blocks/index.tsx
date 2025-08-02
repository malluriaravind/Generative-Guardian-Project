import ButtonsHubPanel from "../../../shared/components/buttons-hub-panel";

const BuildingBlocks = () => {
  return (
    <ButtonsHubPanel
      title="AI Governance Building Blocks"
      onViewAll={() => console.log("View all clicked")}
      blocks={[
        { label: "Transparency", active: true },
        { label: "Explainability", active: true },
        { label: "Access control", active: true },
        { label: "Customer consent", active: true },
        { label: "Data security & user privacy", active: true },
        { label: "Traceability", active: false },
        { label: "Bias detection", active: false },
        { label: "Model governance", active: true },
        { label: "Breach notification", active: false },
        { label: "Periodic audits", active: false },
      ]}
      tagsTitle="Applicable AI Regulations"
      tags={[
        "GDPR",
        "CCPA/CPRA",
        "GLBA",
        "HIPAA",
        "PCI-DSS",
        "NIST AI RMF",
        "ISO/IEC 42001",
        "FCC Privacy Rules",
        "FTC AI Guidelines",
      ]}
    />
  );
};

export default BuildingBlocks;
