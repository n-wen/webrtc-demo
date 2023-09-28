package webrtcService

import (
	"encoding/json"
	"log"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v2"
)

type User struct {
	id    string
	conn  *websocket.Conn
	phone string
	pc    *webrtc.PeerConnection
}

var peerConnectionConfig = webrtc.Configuration{
	ICEServers: []webrtc.ICEServer{
		{
			URLs: []string{"stun:stun.l.google.com:19302"},
		},
	},
}

func NewUser(c *websocket.Conn) *User {
	mediaEngine := webrtc.MediaEngine{}
	mediaEngine.RegisterCodec(webrtc.NewRTPOpusCodec(webrtc.DefaultPayloadTypeOpus, 48000))
	api := webrtc.NewAPI(webrtc.WithMediaEngine(mediaEngine))
	peerConnection, err := api.NewPeerConnection(peerConnectionConfig)
	if err != nil {
		log.Print("NewPeerConnection:", err)
		return nil
	}
	return &User{
		id:    uuid.New().String(),
		conn:  c,
		phone: "",
		pc:    peerConnection,
	}
}

// Send send msg
func (u *User) Send(msg []byte) error {
	log.Printf("send msg: %s\n", string(msg))
	return u.conn.WriteMessage(websocket.TextMessage, msg)
}

func (u *User) SendMessage(m Message) {
	bs, _ := json.Marshal(m)
	u.Send(bs)
}

func (u *User) HandleMsg() {
	for {
		_, msg, err := u.conn.ReadMessage()
		if err != nil {
			log.Println(err)
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
				log.Println(err)
			}
			break
		}
		log.Printf("recv: %s", string(msg))
		var message Message
		err = json.Unmarshal(msg, &message)
		if err != nil {
			log.Println(err)
			break
		}
		switch message.Kind {
		case "setPhone":
			if message.Phone == nil {
				break
			}
			u.phone = *message.Phone
			phoneMap[u.phone] = u
		case "offer":
			if target, ok := phoneMap[*message.To]; ok && target != nil {
				target.SendMessage(Message{Kind: "offer", Offer: message.Offer, From: message.From, To: message.To})
			}
		case "answer":
			if target, ok := phoneMap[*message.To]; ok && target != nil {
				target.SendMessage(Message{Kind: "answer", Answer: message.Answer, From: message.From, To: message.To})
			}
		case "callstart":
			if target, ok := phoneMap[*message.To]; ok && target != nil {
				target.SendMessage(Message{Kind: "callstart", From: message.From, To: message.To})
			}
		}
	}
}
