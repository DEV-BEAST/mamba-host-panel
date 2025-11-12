package docker

import (
	"context"
	"io"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
)

func (c *Client) StartContainer(containerID string) error {
	return c.cli.ContainerStart(c.ctx, containerID, container.StartOptions{})
}

func (c *Client) StopContainer(containerID string) error {
	timeout := 30
	return c.cli.ContainerStop(c.ctx, containerID, container.StopOptions{
		Timeout: &timeout,
	})
}

func (c *Client) RestartContainer(containerID string) error {
	timeout := 30
	return c.cli.ContainerRestart(c.ctx, containerID, container.StopOptions{
		Timeout: &timeout,
	})
}

func (c *Client) KillContainer(containerID string) error {
	return c.cli.ContainerKill(c.ctx, containerID, "SIGKILL")
}

func (c *Client) GetContainerStats(containerID string) (types.ContainerStats, error) {
	stats, err := c.cli.ContainerStats(c.ctx, containerID, false)
	if err != nil {
		return types.ContainerStats{}, err
	}
	defer stats.Body.Close()
	return stats, nil
}

func (c *Client) GetContainerLogs(containerID string, tail string) (string, error) {
	options := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       tail,
	}

	logs, err := c.cli.ContainerLogs(c.ctx, containerID, options)
	if err != nil {
		return "", err
	}
	defer logs.Close()

	logBytes, err := io.ReadAll(logs)
	if err != nil {
		return "", err
	}

	return string(logBytes), nil
}

func (c *Client) InspectContainer(containerID string) (types.ContainerJSON, error) {
	return c.cli.ContainerInspect(c.ctx, containerID)
}

func (c *Client) ListContainers() ([]types.Container, error) {
	return c.cli.ContainerList(c.ctx, container.ListOptions{All: true})
}
