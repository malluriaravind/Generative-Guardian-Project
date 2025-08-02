import { Stack } from "@mui/material";
import { useEffect, useRef, useState } from "react";

const ComplianceBody = () => {
    const ref = useRef();
    const [height, setHeight] = useState("0px");
    const onLoad = () => {
        setHeight(ref.current.contentWindow.document.body.scrollHeight + "px");
    };
    useEffect(() => {
      const interval = setInterval(() => {
        onLoad();
      });
      return () => clearInterval(interval);
    }, []);
    return <Stack justifyContent="center" marginTop="1rem">
        <iframe
        ref={ref}
        onLoad={onLoad}
        id="myFrame"
        src="/ai-compliance-readiness-checklist.html"
        width="100%"
        height={height}
        scrolling="no"
        frameBorder="0"
        style={{
                maxWidth: "100%",
                width: "100%",
                overflow: "auto",
            }}
        ></iframe></Stack>;
}

export default ComplianceBody;