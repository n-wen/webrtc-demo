package webrtcService

import "github.com/pion/webrtc/v2"

type Message struct {
	Kind   string                     `json:"kind"` // setPhone, offer, answer, callto, callin
	From   *string                    `json:"from,omitempty"`
	To     *string                    `json:"to,omitempty"`
	Phone  *string                    `json:"phone,omitempty"`
	Offer  *webrtc.SessionDescription `json:"offer,omitempty"`
	Answer *webrtc.SessionDescription `json:"answer,omitempty"`
}
