import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#00e5ff"
    },
    secondary: {
      main: "#7c4dff"
    },
    background: {
      default: "#0b1220",
      paper: "#111a2e"
    },
    success: {
      main: "#00c853"
    },
    error: {
      main: "#ff1744"
    },
    warning: {
      main: "#ffab00"
    }
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 }
  },
  shape: {
    borderRadius: 12
  }
});

export default theme;