.PHONY: build run test lint clean

BINARY_NAME=wings
MAIN_PATH=./cmd/wings

build:
	@echo "Building..."
	go build -o bin/$(BINARY_NAME) $(MAIN_PATH)

run:
	@echo "Running..."
	go run $(MAIN_PATH)

test:
	@echo "Testing..."
	go test -v ./...

lint:
	@echo "Linting..."
	golangci-lint run

clean:
	@echo "Cleaning..."
	rm -rf bin/
	go clean

install:
	@echo "Installing dependencies..."
	go mod download

dev:
	@echo "Running in development mode..."
	go run $(MAIN_PATH)

# Cross-compilation
build-linux:
	GOOS=linux GOARCH=amd64 go build -o bin/$(BINARY_NAME)-linux-amd64 $(MAIN_PATH)

build-windows:
	GOOS=windows GOARCH=amd64 go build -o bin/$(BINARY_NAME)-windows-amd64.exe $(MAIN_PATH)

build-darwin:
	GOOS=darwin GOARCH=amd64 go build -o bin/$(BINARY_NAME)-darwin-amd64 $(MAIN_PATH)

build-all: build-linux build-windows build-darwin
