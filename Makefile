# Define the image name for Docker
IMAGE_NAME = waseemjutt/transcure

# Define the tag for Docker
TAG = quran

all: release-api

release-api: build-api push-api

# This is a Makefile target named 'build'
build-api:
	docker buildx build --platform linux/amd64 --tag $(IMAGE_NAME):$(TAG)-api -f docker/Dockerfile-api .
	
# This is a Makefile target named 'push'
push-api:
	docker push $(IMAGE_NAME):$(TAG)-api