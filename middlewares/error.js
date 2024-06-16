import { envMode } from "../app.js";

const errorMiddleware = (err, req, res, next) => {
  err.message ||= "Internal Server Error";
  err.statusCode ||= 500;

  if (err.code === 11000) {
    const error = Object.keys(err.keyPattern).join(",");
    err.message = `Duplicate field - ${error} `;
    err.statusCode = 400;
  }

  if (err.name === "CastError") {
    const path = err.path;
    err.message = `invalid format of path ${path}`;
    err.statusCode = 400;
  }

  const response = {
    success: false,
    message: err.message,
  };

  if (envMode === "DEVELOPMENT") {
    response.error = err;
  }

  return res.status(err.statusCode).json(response);
};

export default errorMiddleware;
