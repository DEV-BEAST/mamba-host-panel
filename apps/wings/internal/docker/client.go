package docker

import (
	"context"

	"github.com/docker/docker/client"
)

type Client struct {
	cli *client.Client
	ctx context.Context
}

func NewClient() (*Client, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}

	return &Client{
		cli: cli,
		ctx: context.Background(),
	}, nil
}

func (c *Client) Close() error {
	return c.cli.Close()
}

func (c *Client) GetClient() *client.Client {
	return c.cli
}

func (c *Client) GetContext() context.Context {
	return c.ctx
}
