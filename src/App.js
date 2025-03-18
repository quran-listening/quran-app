// import RecitationContainer from "./component/RecitationContainer";
import RecitationContainer from "./component/RecitationContainer";
import { RecitationProvider } from "./context/RecitationProvider";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import BecomeDev from "./component/BecomeDev";
import Reference from "./component/Reference";
// import QuranSurahConverter from "./component/QuranSurahConverter";
// import QuranData from "./component/QuranData";

function App() {
  return (
    <RecitationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RecitationContainer />} />
          <Route path="/dev" element={<BecomeDev />} />
          <Route path="/reference" element={<Reference />} />
          {/* <Route path="/convert" element={<QuranSurahConverter />} /> */}
          {/* <Route path="/get-json" element={<QuranData />} /> */}
        </Routes>
      </BrowserRouter>
    </RecitationProvider>
  );
}

export default App;
