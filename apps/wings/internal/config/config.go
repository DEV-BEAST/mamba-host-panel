package config

import (
	"github.com/spf13/viper"
)

type Config struct {
	Host        string `mapstructure:"host"`
	Port        int    `mapstructure:"port"`
	Debug       bool   `mapstructure:"debug"`
	TokenSecret string `mapstructure:"token_secret"`
}

func Load() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("/etc/wings/")
	viper.AddConfigPath("$HOME/.wings/")
	viper.AddConfigPath(".")

	// Set defaults
	viper.SetDefault("host", "0.0.0.0")
	viper.SetDefault("port", 8080)
	viper.SetDefault("debug", false)

	// Environment variables
	viper.SetEnvPrefix("WINGS")
	viper.AutomaticEnv()

	// Read config file (optional)
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, err
		}
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, err
	}

	return &config, nil
}
