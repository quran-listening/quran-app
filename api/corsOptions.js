

export const corsOptions = {
  origin: (_origin, cb) => cb(null, true), 
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,  
  optionsSuccessStatus: 200,
  credentials: true, // Allow cookies to be sent
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
};
