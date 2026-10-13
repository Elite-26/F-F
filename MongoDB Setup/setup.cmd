docker run -d `
  --name fandf-mongodb `
  -p 27017:27017 `
  -e MONGO_INITDB_DATABASE=fandf `
  -v fandf-data:/data/db `
  mongo:latest