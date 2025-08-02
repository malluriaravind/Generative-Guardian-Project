import { Button } from "@mui/material";
import React from "react";
import { useState, useCallback } from "react";
import TokenDialog from "../dialogs/TokenDialog";

const TokenDialogButton = () => {
  const [isTokenDialogOpened, setIsTokenDialogOpened] =
    useState<boolean>(false);

  const handleTokenDialogOpen = useCallback(() => {
    setIsTokenDialogOpened(true);
  }, []);

  const handleTokenDialogClose = useCallback(() => {
    setIsTokenDialogOpened(false);
  }, []);

  return (
    <React.Fragment>
      <Button onClick={handleTokenDialogOpen}>Tokens</Button>
      <TokenDialog
        isOpened={isTokenDialogOpened}
        onClose={handleTokenDialogClose}
      />
    </React.Fragment>
  );
};

export default TokenDialogButton;
