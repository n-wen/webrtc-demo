package webrtcclient

import (
	"encoding/json"
	"log"

	"webrtc-demo/pkg/webrtcsvc"

	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v3"
)

type Client struct {
	phone string
	ws    *websocket.Conn
	pc    *webrtc.PeerConnection
}

func NewClient(url, p string) *Client {
	log.Printf("connecting to %s", url)
	c, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		panic(err)
	}
	SendMessage(c, webrtcsvc.Message{Kind: "setPhone", Phone: &p})

	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{
				URLs:       []string{"turn:127.0.0.1:3478"},
				Username:   "test",
				Credential: "test",
			},
		},
	}
	peerConnection, err := webrtc.NewPeerConnection(config)
	if err != nil {
		panic(err)
	}

	return &Client{
		ws:    c,
		phone: p,
		pc:    peerConnection,
	}
}

func SendMessage(c *websocket.Conn, msg webrtcsvc.Message) {
	c.WriteJSON(msg)
}

func (c *Client) Serve() {
	for {
		_, msg, err := c.ws.ReadMessage()
		if err != nil {
			log.Println("read:", err)
			return
		}
		log.Printf("recv: %s", msg)
		var message webrtcsvc.Message
		err = json.Unmarshal(msg, &message)
		if err != nil {
			log.Printf("json unmarshal error: %v\n", err)
			continue
		}

		switch message.Kind {
		case "offer":
			if message.Offer == nil {
				break
			}
			if err = c.pc.SetRemoteDescription(*message.Offer); err != nil {
				log.Printf("error: %v", err)
			} else {
				// Create an answer
				answer, err := c.pc.CreateAnswer(nil)
				if err != nil {
					panic(err)
				}
				gatherComplete := webrtc.GatheringCompletePromise(c.pc)
				err = c.pc.SetLocalDescription(answer)
				if err != nil {
					panic(err)
				}
				<-gatherComplete
				SendMessage(c.ws, webrtcsvc.Message{
					Kind:   "answer",
					From:   &c.phone,
					To:     message.From,
					Answer: c.pc.LocalDescription(),
				})
			}
		}

	}
}

func (c *Client) SetOnTrack(f func(*webrtc.TrackRemote, *webrtc.RTPReceiver)) {
	c.pc.OnTrack(f)
}
