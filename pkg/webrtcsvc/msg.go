package webrtcsvc

import (
	"encoding/json"

	"github.com/pion/webrtc/v3"
)

type Message struct {
	Kind      string                     `json:"kind"` // setPhone, offer, answer, callto, callin
	From      *string                    `json:"from,omitempty"`
	To        *string                    `json:"to,omitempty"`
	Phone     *string                    `json:"phone,omitempty"`
	Offer     *webrtc.SessionDescription `json:"offer,omitempty"`
	Answer    *webrtc.SessionDescription `json:"answer,omitempty"`
	Candidate json.RawMessage            `json:"candidate,omitempty"`
}
