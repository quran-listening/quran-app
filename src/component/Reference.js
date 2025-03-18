// import { Box, Button } from "@mui/material";
// import { useNavigate } from "react-router-dom";
// import ArrowBackIcon from "@mui/icons-material/ArrowBack";
// import { languagesData } from "../utils/constant";

// const Reference = () => {
//   const navigate = useNavigate();
//   return (
//     <Box
//       sx={{
//         padding: "20px",
//         backgroundColor: "#11121B",
//         minHeight: "100vh",
//         position: "relative",
//       }}
//     >
//       <Box
//         onClick={() => navigate("/")}
//         sx={{
//           backgroundColor: "rgba(17, 18, 27, 0.95)",
//           position: "fixed",
//           top: "0px",
//           left: "0px",
//           width: "100%",
//           height: "50px",
//           zIndex: "9999",
//           backdropFilter: "blur(5px)",
//           display: "flex",
//         }}
//       >
//         <Button
//           startIcon={<ArrowBackIcon />}
//           sx={{
//             color: "white",
//             marginLeft: "20px",
//             "&:hover": { color: "#b3b3b3" },
//           }}
//         >
//           Back to home
//         </Button>
//       </Box>
//       <div
//         style={{
//           maxWidth: "600px",
//           margin: "auto",
//           fontFamily: "Arial, sans-serif",
//           color: "#fff",
//         }}
//       >
//         <h2 style={{ marginTop: "50px" }}>Available Languages</h2>
//         <div
//           style={{
//             border: "1px solid #ddd",
//             borderRadius: "8px",
//             padding: "10px",
//           }}
//         >
//           {Object.entries(languagesData).map(([language, details]) => (
//             <div
//               key={language}
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 padding: "8px",
//                 borderBottom: "1px solid #ddd",
//               }}
//             >
//               <span style={{ fontWeight: "bold", textTransform: "capitalize" }}>
//                 {language}
//               </span>
//               {details.jsonUrl ? (
//                 <a
//                   href={details.jsonUrl}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   style={{ color: "#007BFF", textDecoration: "none" }}
//                 >
//                   {details.jsonUrl}
//                 </a>
//               ) : (
//                 <span style={{ color: "red" }}>Not Available</span>
//               )}
//             </div>
//           ))}
//         </div>
//       </div>
//       );
//     </Box>
//   );
// };

// export default Reference;

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
import { languagesData } from "../utils/constant";
import { useTheme } from "@mui/material/styles";


const Reference = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // Detect if screen is less than 600px


  return (
    <Box
      sx={{
        backgroundColor: "#11121B",
        minHeight: "100vh",
      }}
    >
      {/* Top Navigation Bar */}
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

      {/* Content Container */}
      <Container maxWidth="md" sx={{ paddingTop: "80px", color: "#fff" }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Typography variant="h4" gutterBottom>
            Available Languages
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ padding: 2, backgroundColor: "#1C1E2A" }}>
          {Object.entries(languagesData).map(([language, details], index) => (
            <Box key={language} sx={{ paddingY: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems:isMobile? "flex-start":"center",
                  flexDirection: isMobile? "column" : "row",
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: "bold",
                    textTransform: "capitalize",
                    color: "#fff",
                  }}
                >
                  {language}
                </Typography>
                {details.jsonUrl ? (
                  <Link
                    href={details.jsonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: "#007BFF",
                      textDecoration: "none",
                      fontSize: "0.9rem",
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
              {index < Object.keys(languagesData).length - 1 && (
                <Divider sx={{ backgroundColor: "#555" }} />
              )}
            </Box>
          ))}
        </Paper>
      </Container>
    </Box>
  );
};

export default Reference;
