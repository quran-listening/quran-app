const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"];

export const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  optionsSuccessStatus: 200,
  credentials: true, // Allow cookies to be sent
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
};
