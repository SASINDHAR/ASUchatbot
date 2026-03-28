# Use the official Nginx image as a base
FROM nginx:alpine

# Copy the frontend files to the default Nginx public directory
COPY index.html /usr/share/nginx/html/
COPY index.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/

# Expose port 80 for the frontend
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
