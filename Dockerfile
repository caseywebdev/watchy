FROM node:0.10.35-slim

# Install dependencies.
COPY package.json /usr/local/src/
WORKDIR /usr/local/src
RUN npm install --production

# Symlink watchy executable for convenience.
COPY bin/watchy /usr/local/src/bin/
RUN ln -s /usr/local/src/bin/watchy /usr/local/bin/

# Copy the code into the container.
COPY . /usr/local/src

# Set default envvars.
ENV ROOT_DIR /assets
ENV ARGS -- true

# Run watchy in the given directory with the given config file.
CMD cd $ROOT_DIR && exec watchy $ARGS
