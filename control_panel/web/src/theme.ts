import { GridOwnProps } from "@mui/material";
import { createTheme } from "@mui/material/styles";

declare module "@mui/material/Button" {
  interface ButtonPropsVariantOverrides {
    grayed: true;
  }
  interface SelectProps {
    grayed: true;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    price: true;
  }
}

export const theme = createTheme({
  palette: {},
  components: {
    MuiButton: {
      variants: [
        {
          props: { variant: "grayed" },
          style: { color: "rgba(0,0,0,0.75)" },
        },
      ],
    },
    MuiLink: {
      defaultProps: {
        color: "#0C56D0",
        fontWeight: 700,
        underline: "none",
      },
    },
    MuiTypography: {
      defaultProps: {
        fontFamily: "'Encode Sans', sans-serif",
        fontStyle: "normal",
      },
    },
  },
});
export const buttonStyles = {
  backgroundColor: "transparent",
  color: "black",
  border: "0.5px solid black",
  width: {
    xs: "0px",
    md: "0px",
    lg: "50px",
    xl: "150px",
  },
};
export const ListStyles = {
  ml: "6px",
  color: "black",
  fontStyle: "italic",
};
export const UtilizationTypography = {
  color: "#9E9E9E",
  fontSize: "16px",
  fontWeight: "600",
};

export const filterContainerStyles = {
  marginTop: {
    xs: "0px",
    md: "-30px",
    lg: "-30px",
    xl: "-30px",
  },
};

export const textFieldStyles = {
  width: {
    xs: "250px",
    md: "250px",
    lg: "200px",
    xl: "250px",
  },
  marginTop: {
    xs: "0px",
    md: "0px",
    lg: "-3%",
    xl: "-30px",
  },
  marginLeft: {
    xs: "0%",
    md: "0%",
    lg: "50%",
    xl: "50%",
  },
};

export const filtersGridItem: GridOwnProps = {
  xs: 12,
  md: 6,
  display: "flex",
  flexDirection: "row",
  alignContent: "center",
  gap: 1,
  sx: {
    justifyContent: {
      md: "end",
      xs: "center",
    },
  },
};

export const calendarIconStyles = {
  backgroundColor: "#656565",
  borderRadius: "8px",
  padding: "0px 16px",
  "&:hover": {
    backgroundColor: "#505050",
  },
  ".white-icon": {
    color: "#fff",
  },
  "@media (min-width: 0px)": {
    margin: "8px 0px",
    paddingTop: "0px",
  },
  "@media (min-width: 900px)": {
    margin: "16px 0px",
  },
};
