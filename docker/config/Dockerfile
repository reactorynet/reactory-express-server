# NODE_VERSION must be declared before FROM so it can be used in the FROM instruction.
# The default matches .nvmrc — override by passing --build-arg NODE_VERSION=<version>.
ARG NODE_VERSION=20.19.4
FROM node:${NODE_VERSION}

ARG REACTORY_CONFIG_ID
ARG REACTORY_ENV_ID
# Passed by build-image.sh: "true" when *.crt files exist in the local certificates/ dir.
# Controls whether custom cert installation and verification steps are executed.
ARG HAS_CUSTOM_CERTS=false
# When HAS_CUSTOM_CERTS=true, build-image.sh sets this to the in-image cert bundle path
# so that Node.js trusts custom CA certificates at runtime.
ARG NODE_EXTRA_CA_CERTS_VALUE=""

# BUILD_VERSION is passed from build-image.sh (read from package.json).
# Declaring it as an ARG first lets it override the ENV default below.
ARG BUILD_VERSION=latest
ENV BUILD_VERSION=${BUILD_VERSION}
ENV ENV_ID=${REACTORY_ENV_ID:-podman}
ENV CONFIG_ID=${REACTORY_CONFIG_ID:-reactory}
ENV CERTIFICATES_PATH=/usr/local/share/ca-certificates
ENV WORKDIR_PATH=/${CONFIG_ID}/reactory-express-server
ENV BUILD_TAR_FILE=${CONFIG_ID}-server-${ENV_ID}-${BUILD_VERSION}.tar.gz
# Only set when custom certs are present; empty string means Node uses its default trust store.
ENV NODE_EXTRA_CA_CERTS=${NODE_EXTRA_CA_CERTS_VALUE}

# Copy certificates into the image.
# build-image.sh guarantees the local certificates/ directory exists (creating it if absent),
# so this COPY is always safe even when no custom certs are provided.
COPY certificates/ ${CERTIFICATES_PATH}/

# Update the system trust store, then conditionally verify the custom cert bundle.
# The verify step is skipped when HAS_CUSTOM_CERTS is not "true", preventing a build
# failure when no custom certificates are present.
RUN update-ca-certificates && \
	if [ "${HAS_CUSTOM_CERTS}" = "true" ]; then \
		echo "🔐 Verifying custom certificate bundle..." && \
		openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt "${CERTIFICATES_PATH}/ca-certificates.crt" && \
		echo "✅ Custom certificate bundle verified"; \
	else \
		echo "ℹ️  HAS_CUSTOM_CERTS is not set — skipping custom certificate verification"; \
	fi

# Install required system packages.
RUN apt-get update -y && \
	apt-get -y install \
	build-essential \
	chromium \
	libcairo2-dev \
	libgif-dev \
	libjpeg-dev \
	libpango1.0-dev \
	librsvg2-dev && \
	apt-get clean && \
	rm -rf /var/lib/apt/lists/*

WORKDIR /

# Create a reactory user and group
# RUN groupadd -r reactory && useradd -r -g reactory reactory

# Set the password for the reactory user using environment variables
# ENV REACTORY_USER_PASSWORD=${REACTORY_USER_PASSWORD:-reactory}
# RUN echo "reactory:${REACTORY_USER_PASSWORD}" | chpasswd

RUN mkdir -p /reactory/reactory-core && \
	mkdir -p /reactory/reactory-express-server && \
	mkdir -p /reactory/reactory-pwa-client && \
	mkdir -p /reactory/reactory-data && \
	mkdir -p /reactory/reactory-docs && \
	mkdir -p /reactory/reactory-data/plugins

WORKDIR ${WORKDIR_PATH}

COPY build/server/${CONFIG_ID}/${BUILD_TAR_FILE} ${WORKDIR_PATH}

RUN tar -xvzf ${BUILD_TAR_FILE} > /dev/null 2>&1 && \
	rm ${BUILD_TAR_FILE} && \
	yarn install --production && \
	yarn global add env-cmd && \
	yarn cache clean && \
	rm -rf /tmp/*
