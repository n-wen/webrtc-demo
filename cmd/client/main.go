package main

import (
	"webrtc-demo/pkg/webrtcclient"
)

const phone = "123"

func main() {
	c := webrtcclient.NewClient("ws://127.0.0.1:9999/signaling", phone)
	webrtcclient.SetSaveToDisk(c)
	c.Serve()
}
