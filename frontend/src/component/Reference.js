import {
  Box,
  Button,
  Typography,
  Link,
  AppBar,
  Toolbar,
  Container,
  Paper,
  Divider,
  useMediaQuery,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useTheme } from "@mui/material/styles";
import { languagesData } from "../utils/constant";

const Reference = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box sx={{ backgroundColor: "#11121B", minHeight: "100vh" }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: "rgba(17, 18, 27, 0.95)",
          backdropFilter: "blur(5px)",
        }}
      >
        <Toolbar>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/")}
            sx={{ color: "white", "&:hover": { color: "#b3b3b3" } }}
          >
            Back to Home
          </Button>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ paddingTop: "80px", color: "#fff",overflow:"auto" }}>
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Typography variant= {isMobile ? "h6" : "h4"} gutterBottom>
            Available Languages
          </Typography>
        </Box>

        <Paper
          elevation={3}
          sx={{
            padding: 2,
            backgroundColor: "#1C1E2A",
            minWidth: "1000px",
            overflow: "auto",
          }}
        >
          {/* Header Row */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              // flexDirection: isMobile ? "column" : "row",
              borderBottom: "2px solid #555",
              paddingY: 1,
              marginBottom: 1,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ color: "#fff", fontWeight: "bold", flex: 1 }}
            >
              Language
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{ color: "#fff", fontWeight: "bold", flex: 2 }}
            >
              Translator
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{ color: "#fff", fontWeight: "bold", flex: 2 }}
            >
              Web Source
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{ color: "#fff", fontWeight: "bold", flex: 4 }}
            >
              JSON URL
            </Typography>
          </Box>

          {/* Data Rows */}
          {Object.entries(languagesData).map(([language, details], index) => (
            <Box key={language}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  // alignItems: isMobile ? "flex-start" : "center",
                  // flexDirection: isMobile ? "column" : "row",
                }}
              >
                {/* Language */}
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: "bold",
                    textTransform: "capitalize",
                    color: "#fff",
                    flex: 1,
                    fontSize: "13px",
                  }}
                >
                  {language}
                </Typography>

                {/* Translator */}
                <Typography sx={{ flex: 2, fontSize: "13px", color: "#fff" }}>
                  {details.translator || (
                    <Typography variant="body2" sx={{ color: "red" }}>
                      Not Available
                    </Typography>
                  )}
                </Typography>

                {/* Web Source */}
                <Typography sx={{ flex: 2, fontSize: "13px", color: "#fff" }}>
                  {details.webSource || (
                    <Typography variant="body2" sx={{ color: "red" }}>
                      Not Available
                    </Typography>
                  )}
                </Typography>

                {/* JSON URL */}
                <Box sx={{ flex: 4 }}>
                  {details.jsonUrl ? (
                    <Link
                      href={details.jsonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        color: "#007BFF",
                        textDecoration: "none",
                        // fontSize: "0.9rem",
                        wordBreak: "break-all",
                        fontSize: "13px",
                      }}
                    >
                      {details.jsonUrl}
                    </Link>
                  ) : (
                    <Typography variant="body2" sx={{ color: "red" }}>
                      Not Available
                    </Typography>
                  )}
                </Box>
              </Box>

              {index < Object.keys(languagesData).length - 1 && (
                <Divider sx={{ backgroundColor: "#555", my: 1 }} />
              )}
            </Box>
          ))}
        </Paper>
      </Container>
    </Box>
  );
};

export default Reference;
