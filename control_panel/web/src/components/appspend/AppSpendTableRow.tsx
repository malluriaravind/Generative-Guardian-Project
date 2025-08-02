import { Collapse, IconButton, TableCell, TableRow } from "@mui/material";
import { useState } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Stats, StatsType } from "../../types/stats";
import AppSpendTableCollapseBody from "./AppSpendTableCollapseBody";
import PriceTypography from "../PriceTypography";
import ArrowedNumber from "../ArrowedNumber";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
type AppSpendTableRowProps = {
  item: Stats;
  type: StatsType;
};

const AppSpendTableRow = ({ item, type }: AppSpendTableRowProps) => {
  const [isPanelOpened, setOpenPanel] = useState<boolean>(false);

  const [isActive, setActive] = useState(false);

  const handleCellClick = () => {
    setActive(!isActive);
  };

  return (
    <>
      <TableRow
        sx={{
          backgroundColor: isActive ? "#d5dfed" : "inherit",
        }}
      >
        <TableCell
          style={{
            padding: "4px  4px  4px  4px",
            height: "2vh",
          }}
          onClick={handleCellClick}
        >
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpenPanel(!isPanelOpened)}
          >
            {isPanelOpened ? <ArrowDropDownIcon /> : <ArrowRightIcon />}
          </IconButton>
          {item.name}
        </TableCell>
        <TableCell
          sx={{
            padding: "4px 4px 4px 4px",
          }}
          align="center"
        >
          <PriceTypography
            fontSize="14px"
            decimalCount={2}
            value={item.total_tokens}
          />
        </TableCell>
        <TableCell
          sx={{
            padding: "4px 4px 4px 4px",
          }}
          align="center"
        >
          <PriceTypography
            fontSize="14px"
            decimalCount={2}
            prefix="$"
            value={item.total_cost}
          />
        </TableCell>
        <TableCell
          sx={{
            padding: "4px 4px 4px 4px",
            textAlign: "center",
          }}
          align="center"
        >
          {!item.cost_trend ? (
            "N/A"
          ) : (
            <ArrowedNumber
              trend={item.cost_trend < 0 ? "down" : "up"}
              justifyContent="center"
              value={
                <PriceTypography
                  textAlign={"start"}
                  fontSize="14px"
                  prefix="$"
                  decimalCount={2}
                  value={Math.abs(item.cost_trend)}
                />
              }
            />
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell
          sx={{
            padding: "4px 4px 4px 4px",
            textAlign: "center",
          }}
          style={{ paddingBottom: 0, paddingTop: 0 }}
          colSpan={6}
        >
          <Collapse in={isPanelOpened} timeout="auto" unmountOnExit>
            <AppSpendTableCollapseBody id={item._id} type={type} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default AppSpendTableRow;
