const path = require("path");
const HtmlWebpackPlugin = require('html-webpack-plugin');


module.exports = {
  entry: ["./src/js/app.js"],
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.js",
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    fallback: {
      "stream": false,
      "crypto": false,
      "os": false,
      "buffer": false,
      "https": false,
      "http": false,
      "vm": false,
    }
  }
};
