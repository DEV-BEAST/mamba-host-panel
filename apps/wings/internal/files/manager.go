package files

import (
	"archive/tar"
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"go.uber.org/zap"
)

// FileInfo represents metadata about a file or directory
type FileInfo struct {
	Name      string `json:"name"`
	Path      string `json:"path"`
	Size      int64  `json:"size"`
	IsDir     bool   `json:"isDir"`
	Mode      string `json:"mode"`
	ModTime   string `json:"modTime"`
	Extension string `json:"extension,omitempty"`
}

// Manager handles file operations for containers
type Manager struct {
	dockerClient *client.Client
	logger       *zap.Logger
}

// NewManager creates a new file manager
func NewManager(dockerClient *client.Client, logger *zap.Logger) *Manager {
	return &Manager{
		dockerClient: dockerClient,
		logger:       logger,
	}
}

// ListFiles lists files in a container directory
func (m *Manager) ListFiles(ctx context.Context, containerID, path string) ([]FileInfo, error) {
	m.logger.Debug("Listing files",
		zap.String("containerID", containerID[:12]),
		zap.String("path", path))

	// Normalize path
	if path == "" {
		path = "/"
	}

	// Execute ls command in container
	execConfig := types.ExecConfig{
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          []string{"/bin/sh", "-c", fmt.Sprintf("ls -la %s", path)},
	}

	execID, err := m.dockerClient.ContainerExecCreate(ctx, containerID, execConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create exec: %w", err)
	}

	attachResp, err := m.dockerClient.ContainerExecAttach(ctx, execID.ID, types.ExecStartCheck{})
	if err != nil {
		return nil, fmt.Errorf("failed to attach to exec: %w", err)
	}
	defer attachResp.Close()

	// Start exec
	if err := m.dockerClient.ContainerExecStart(ctx, execID.ID, types.ExecStartCheck{}); err != nil {
		return nil, fmt.Errorf("failed to start exec: %w", err)
	}

	// Read output
	output, err := io.ReadAll(attachResp.Reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read output: %w", err)
	}

	// Parse ls output
	files := parseL

SOutput(string(output), path)

	return files, nil
}

// ReadFile reads the contents of a file from a container
func (m *Manager) ReadFile(ctx context.Context, containerID, filePath string) ([]byte, error) {
	m.logger.Debug("Reading file",
		zap.String("containerID", containerID[:12]),
		zap.String("path", filePath))

	// Copy file from container as tar archive
	reader, _, err := m.dockerClient.CopyFromContainer(ctx, containerID, filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to copy from container: %w", err)
	}
	defer reader.Close()

	// Extract file from tar
	tarReader := tar.NewReader(reader)
	header, err := tarReader.Next()
	if err != nil {
		return nil, fmt.Errorf("failed to read tar: %w", err)
	}

	if header.Typeflag != tar.TypeReg {
		return nil, fmt.Errorf("path is not a regular file")
	}

	// Read file contents
	contents, err := io.ReadAll(tarReader)
	if err != nil {
		return nil, fmt.Errorf("failed to read file contents: %w", err)
	}

	return contents, nil
}

// WriteFile writes content to a file in a container
func (m *Manager) WriteFile(ctx context.Context, containerID, filePath string, content []byte) error {
	m.logger.Debug("Writing file",
		zap.String("containerID", containerID[:12]),
		zap.String("path", filePath),
		zap.Int("size", len(content)))

	// Create tar archive with file
	var buf bytes.Buffer
	tarWriter := tar.NewWriter(&buf)

	// Get file name and directory
	fileName := filepath.Base(filePath)
	dirPath := filepath.Dir(filePath)

	// Write file to tar
	header := &tar.Header{
		Name:    fileName,
		Mode:    0644,
		Size:    int64(len(content)),
		ModTime: time.Now(),
	}

	if err := tarWriter.WriteHeader(header); err != nil {
		return fmt.Errorf("failed to write tar header: %w", err)
	}

	if _, err := tarWriter.Write(content); err != nil {
		return fmt.Errorf("failed to write tar content: %w", err)
	}

	if err := tarWriter.Close(); err != nil {
		return fmt.Errorf("failed to close tar writer: %w", err)
	}

	// Copy tar to container
	err := m.dockerClient.CopyToContainer(ctx, containerID, dirPath, &buf, types.CopyToContainerOptions{
		AllowOverwriteDirWithFile: true,
	})
	if err != nil {
		return fmt.Errorf("failed to copy to container: %w", err)
	}

	return nil
}

// DeleteFile deletes a file or directory from a container
func (m *Manager) DeleteFile(ctx context.Context, containerID, path string) error {
	m.logger.Info("Deleting file",
		zap.String("containerID", containerID[:12]),
		zap.String("path", path))

	// Execute rm command in container
	execConfig := types.ExecConfig{
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          []string{"/bin/sh", "-c", fmt.Sprintf("rm -rf %s", path)},
	}

	execID, err := m.dockerClient.ContainerExecCreate(ctx, containerID, execConfig)
	if err != nil {
		return fmt.Errorf("failed to create exec: %w", err)
	}

	if err := m.dockerClient.ContainerExecStart(ctx, execID.ID, types.ExecStartCheck{}); err != nil {
		return fmt.Errorf("failed to start exec: %w", err)
	}

	return nil
}

// CreateDirectory creates a directory in a container
func (m *Manager) CreateDirectory(ctx context.Context, containerID, path string) error {
	m.logger.Info("Creating directory",
		zap.String("containerID", containerID[:12]),
		zap.String("path", path))

	// Execute mkdir command in container
	execConfig := types.ExecConfig{
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          []string{"/bin/sh", "-c", fmt.Sprintf("mkdir -p %s", path)},
	}

	execID, err := m.dockerClient.ContainerExecCreate(ctx, containerID, execConfig)
	if err != nil {
		return fmt.Errorf("failed to create exec: %w", err)
	}

	if err := m.dockerClient.ContainerExecStart(ctx, execID.ID, types.ExecStartCheck{}); err != nil {
		return fmt.Errorf("failed to start exec: %w", err)
	}

	return nil
}

// CompressFiles creates a compressed archive of files
func (m *Manager) CompressFiles(ctx context.Context, containerID string, paths []string, outputPath string) error {
	m.logger.Info("Compressing files",
		zap.String("containerID", containerID[:12]),
		zap.Strings("paths", paths),
		zap.String("output", outputPath))

	// Execute tar command in container
	pathsStr := strings.Join(paths, " ")
	cmd := fmt.Sprintf("tar -czf %s %s", outputPath, pathsStr)

	execConfig := types.ExecConfig{
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          []string{"/bin/sh", "-c", cmd},
	}

	execID, err := m.dockerClient.ContainerExecCreate(ctx, containerID, execConfig)
	if err != nil {
		return fmt.Errorf("failed to create exec: %w", err)
	}

	if err := m.dockerClient.ContainerExecStart(ctx, execID.ID, types.ExecStartCheck{}); err != nil {
		return fmt.Errorf("failed to start exec: %w", err)
	}

	return nil
}

// ExtractArchive extracts a compressed archive
func (m *Manager) ExtractArchive(ctx context.Context, containerID, archivePath, targetPath string) error {
	m.logger.Info("Extracting archive",
		zap.String("containerID", containerID[:12]),
		zap.String("archive", archivePath),
		zap.String("target", targetPath))

	// Execute tar extract command in container
	cmd := fmt.Sprintf("tar -xzf %s -C %s", archivePath, targetPath)

	execConfig := types.ExecConfig{
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          []string{"/bin/sh", "-c", cmd},
	}

	execID, err := m.dockerClient.ContainerExecCreate(ctx, containerID, execConfig)
	if err != nil {
		return fmt.Errorf("failed to create exec: %w", err)
	}

	if err := m.dockerClient.ContainerExecStart(ctx, execID.ID, types.ExecStartCheck{}); err != nil {
		return fmt.Errorf("failed to start exec: %w", err)
	}

	return nil
}

// parseLSOutput parses ls -la output into FileInfo structs
func parseLSOutput(output, basePath string) []FileInfo {
	files := []FileInfo{}
	lines := strings.Split(output, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "total") {
			continue
		}

		// Parse ls -la format
		// -rw-r--r-- 1 user group size date time name
		parts := strings.Fields(line)
		if len(parts) < 9 {
			continue
		}

		mode := parts[0]
		size := parts[4]
		name := parts[8]

		// Skip . and ..
		if name == "." || name == ".." {
			continue
		}

		isDir := strings.HasPrefix(mode, "d")

		// Parse size
		var sizeInt int64
		fmt.Sscanf(size, "%d", &sizeInt)

		// Build file info
		fileInfo := FileInfo{
			Name:  name,
			Path:  filepath.Join(basePath, name),
			Size:  sizeInt,
			IsDir: isDir,
			Mode:  mode,
		}

		if !isDir {
			fileInfo.Extension = filepath.Ext(name)
		}

		files = append(files, fileInfo)
	}

	return files
}

// GetFileSize gets the size of a file
func (m *Manager) GetFileSize(ctx context.Context, containerID, filePath string) (int64, error) {
	// Execute stat command
	execConfig := types.ExecConfig{
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          []string{"/bin/sh", "-c", fmt.Sprintf("stat -c %%s %s", filePath)},
	}

	execID, err := m.dockerClient.ContainerExecCreate(ctx, containerID, execConfig)
	if err != nil {
		return 0, fmt.Errorf("failed to create exec: %w", err)
	}

	attachResp, err := m.dockerClient.ContainerExecAttach(ctx, execID.ID, types.ExecStartCheck{})
	if err != nil {
		return 0, fmt.Errorf("failed to attach to exec: %w", err)
	}
	defer attachResp.Close()

	if err := m.dockerClient.ContainerExecStart(ctx, execID.ID, types.ExecStartCheck{}); err != nil {
		return 0, fmt.Errorf("failed to start exec: %w", err)
	}

	output, err := io.ReadAll(attachResp.Reader)
	if err != nil {
		return 0, fmt.Errorf("failed to read output: %w", err)
	}

	var size int64
	fmt.Sscanf(string(output), "%d", &size)

	return size, nil
}
