import { useRouter } from 'next/router'
import React, {useState, useEffect, useRef, createRef} from "react";

import Link from 'next/link'
import io from 'socket.io-client'
import faker from "faker"

import {IconButton, Badge, Input, Button} from '@material-ui/core'
import VideocamIcon from '@mui/icons-material/Videocam'
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare'
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import CallEndIcon from '@mui/icons-material/CallEnd'
import ChatIcon from '@mui/icons-material/Chat'

import { message } from 'antd'
import 'antd/dist/antd.css'

import { Row } from 'reactstrap'
import Modal from 'react-bootstrap/Modal'
import 'bootstrap/dist/css/bootstrap.css'
import "../../../styles/meeting.module.css"
// const server_url = "http://localhost:4002"
// const server_url = 'https://video.sebastienbiollo.com'
const server_url = "https://thawing-tundra-96874.herokuapp.com/"
// const server_url = process.env.NODE_ENV === 'production' ? 'https://video.sebastienbiollo.com' : "http://localhost:4002"
import dynamic from 'next/dynamic'

var connections = {}
const peerConnectionConfig = {
	'iceServers': [
		// { 'urls': 'stun:stun.services.mozilla.com' },
		{ 'urls': 'stun:stun.l.google.com:19302' },
	]
}
var socket = null
var socketId = null
var elms = 0

const Meeting = () => {
  const router = useRouter()
  const { id } = router.query
  const localVideoref = useRef()

  const [videoAvailable, setvideoAvailable] = useState(true)
  const [video, setvideo] = useState(true)
  const [audio, setaudio] = useState(true)
  const [askForUsername, setaskForUsername] = useState(true)
  const [username, setusername] = useState(faker.internet.userName())
  const [audioAvailable, setaudioAvailable] = useState(true)


  useEffect(() => {
      console.log('effect')
      getPermissions()
    },[])
  
  const getPermissions = async () => {
    try {

            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then((stream) => {
                    setaudioAvailable(true)
                    setvideoAvailable(true)
                    window.localStream = stream
                    localVideoref.current.srcObject = stream
                })
                .then((stream) => {
                    console.log(stream)
                })
                .catch((e) => console.log(e))
                console.log(videoAvailable)
                console.log(audioAvailable)
    } catch (err) {
        console.log(err);
      }
  }

  const connectToSocketServer = () => {
    socket = io.connect(server_url, { secure: true,transports : ['websocket']})

    socket.on('signal', gotMessageFromServer)

    socket.on('connect', () => {
        console.log('connected')
        socket.emit('join-call', window.location.href)
        socketId = socket.id

        socket.on('user-left', (id) => {
            let video = document.querySelector(`[data-socket="${id}"]`)
            if (video !== null) {
                elms--
                video.parentNode.removeChild(video)

                let main = document.getElementById('main')
                changeCssVideos(main)
            }
        })
        socket.on('user-joined', (id, clients) => {
            clients.forEach((socketListId) => {
                connections[socketListId] = new RTCPeerConnection(peerConnectionConfig)
                // Wait for their ice candidate       
                connections[socketListId].onicecandidate = function (event) {
                    if (event.candidate != null) {
                        socket.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
                    }
                }
                console.log('connected2')

                // Wait for their video stream
                console.log(socketListId)
                connections[socketListId].onaddstream = (event) => {
                    // TODO mute button, full screen button
                    console.log('connected3',event)
                    console.log('addstream')
                    var searchVidep = document.querySelector(`[data-socket="${socketListId}"]`)
                    if (searchVidep !== null) { // if i don't do this check it make an empyt square
                        searchVidep.srcObject = event.stream
                    } else {
                        elms = clients.length
                        let main = document.getElementById('main')
                        console.log(main)
                        let cssMesure = changeCssVideos(main)

                        let video = document.createElement('video')

                        let css = {minWidth: cssMesure.minWidth, minHeight: cssMesure.minHeight, maxHeight: "100%", margin: "10px",
                            borderStyle: "solid", borderColor: "#bdbdbd", objectFit: "fill"}
                        for(let i in css) video.style[i] = css[i]

                        video.style.setProperty("width", cssMesure.width)
                        video.style.setProperty("height", cssMesure.height)
                        video.setAttribute('data-socket', socketListId)
                        video.srcObject = event.stream
                        video.autoplay = true
                        video.playsinline = true

                        main.appendChild(video)
                    }
                }

                // Add the local video stream
                console.log(window.localStream)
                if (window.localStream !== undefined && window.localStream !== null) {
                    connections[socketListId].addStream(window.localStream)
                } else {
                    let blackSilence = (...args) => new MediaStream([black(...args), silence()])
                    window.localStream = blackSilence()
                    connections[socketListId].addStream(window.localStream)
                }
            })

            if (id === socketId) {
                for (let id2 in connections) {
                    if (id2 === socketId) continue
                    
                    try {
                        connections[id2].addStream(window.localStream)
                    } catch(e) {}
        
                    connections[id2].createOffer().then((description) => {
                        connections[id2].setLocalDescription(description)
                            .then(() => {
                                socket.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
                            })
                            .catch(e => console.log(e))
                    })
                }
            }
        })
    })
}

const silence = () => {
    let ctx = new AudioContext()
    let oscillator = ctx.createOscillator()
    let dst = oscillator.connect(ctx.createMediaStreamDestination())
    oscillator.start()
    ctx.resume()
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
}
const black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), { width, height })
    canvas.getContext('2d').fillRect(0, 0, width, height)
    let stream = canvas.captureStream()
    return Object.assign(stream.getVideoTracks()[0], { enabled: false })
}


const gotMessageFromServer = (fromId, message) => {
    var signal = JSON.parse(message)

    if (fromId !== socketId) {
        if (signal.sdp) {
            connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                if (signal.sdp.type === 'offer') {
                    connections[fromId].createAnswer().then((description) => {
                        connections[fromId].setLocalDescription(description).then(() => {
                            socket.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
                        }).catch(e => console.log(e))
                    }).catch(e => console.log(e))
                }
            }).catch(e => console.log(e))
        }

        if (signal.ice) {
            connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
        }
    }
}

const changeCssVideos = (main) => {
    let widthMain = main.offsetWidth
    let minWidth = "30%"
    if ((widthMain * 30 / 100) < 300) {
        minWidth = "300px"
    }
    let minHeight = "40%"

    let height = String(100 / elms) + "%"
    let width = ""
    if(elms === 0 || elms === 1) {
        width = "100%"
        height = "100%"
    } else if (elms === 2) {
        width = "45%"
        height = "100%"
    } else if (elms === 3 || elms === 4) {
        width = "35%"
        height = "50%"
    } else {
        width = String(100 / elms) + "%"
    }

    let videos = main.querySelectorAll("video")
    for (let a = 0; a < videos.length; ++a) {
        videos[a].style.minWidth = minWidth
        videos[a].style.minHeight = minHeight
        videos[a].style.setProperty("width", width)
        videos[a].style.setProperty("height", height)
    }

    return {minWidth, minHeight, width, height}
}

  
  const copyUrl = () => {
    let text = window.location.href
    if (!navigator.clipboard) {
        let textArea = document.createElement("textarea")
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        try {
            document.execCommand('copy')
            message.success("Link copied to clipboard!")
        } catch (err) {
            message.error("Failed to copy")
        }
        document.body.removeChild(textArea)
        return
    }
    navigator.clipboard.writeText(text).then(function () {
        message.success("Link copied to clipboard!")
    }, () => {
        message.error("Failed to copy")
    })
}
const connect = () => {
    console.log('here')
    setaskForUsername(false)
    getMedia()
}
const handleVideo = () => {
    console.log('handle video')
    setvideo(!video)
     getUserMedia()
}
const handleAudio = () => {
    console.log('handle audio')

    setaudio(!audio)
    getUserMedia()
}

const getMedia = () => {
    console.log('here2')
    console.log(videoAvailable)
    console.log(audioAvailable)
    setvideo(videoAvailable)
    setaudio(audioAvailable),
    getUserMedia()
    connectToSocketServer()
}


const getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
        navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
            .then(getUserMediaSuccess)
            .then((stream) => {})
            .catch((e) => console.log(e))
    } else {
        try {
            let tracks = localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) {}
    }
}

const getUserMediaSuccess = (stream) => {
    try {
        window.localStream.getTracks().forEach(track => track.stop())
    } catch(e) { console.log(e) }

    window.localStream = stream
    localVideoref.current.srcObject = stream

    for (let id in connections) {
        if (id === socketId) continue

        connections[id].addStream(window.localStream)

        connections[id].createOffer().then((description) => {
            connections[id].setLocalDescription(description)
                .then(() => {
                    socket.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                })
                .catch(e => console.log(e))
        })
    }

    stream.getTracks().forEach(track => track.onended = () => {
        setvideo(false)
        setaudio(false), () => {
            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch(e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([this.black(...args), this.silence()])
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream

            for (let id in connections) {
                connections[id].addStream(window.localStream)

                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socket.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                        })
                        .catch(e => console.log(e))
                })
            }
        }
    })
}

const handleEndCall = () => {
    try {
        let tracks = localVideoref.current.srcObject.getTracks()
        tracks.forEach(track => track.stop())
    } catch (e) {}
    window.location.href = "/"
}

  return (
    <>
      <h1>Meeting: {id}</h1>
      <div>
				{askForUsername === true ?
					<div>
						<div style={{background: "white", width: "30%", height: "auto", padding: "20px", minWidth: "400px",
								textAlign: "center", margin: "auto", marginTop: "50px", justifyContent: "center"}}>
							<p style={{ margin: 0, fontWeight: "bold", paddingRight: "50px" }}>Set your username</p>
							<Input placeholder="Username" value={username} onChange={e => setusername(e.target.value)} />
							<Button variant="contained" color="primary" onClick={connect} style={{ margin: "20px" }}>Connect</Button>
						</div>

						<div style={{ justifyContent: "center", textAlign: "center", paddingTop: "40px" }}>
							<video id="my-video" ref={localVideoref} autoPlay muted style={{
								borderStyle: "solid",borderColor: "#bdbdbd",objectFit: "fill",width: "60%",height: "30%"}}></video>
						</div>
					</div>
					:
					<div>
						<div className="btn-down" style={{ backgroundColor: "whitesmoke", color: "whitesmoke", textAlign: "center" }}>
							<IconButton style={{ color: "#424242" }} onClick={handleVideo}>
								{(video === true) ? <VideocamOffIcon /> : <VideocamIcon />}
							</IconButton>

							<IconButton style={{ color: "#f44336" }} onClick={handleEndCall}>
								<CallEndIcon />
							</IconButton>

							<IconButton style={{ color: "#424242" }} onClick={handleAudio}>
								{audio === true ? <MicOffIcon /> : <MicIcon />}
							</IconButton>


						</div>

						<div className="container">
							<div style={{ paddingTop: "20px" }}>
								<Input value={window.location.href} disable="true"></Input>
								<Button style={{backgroundColor: "#3f51b5",color: "whitesmoke",marginLeft: "20px",
									marginTop: "10px",width: "120px",fontSize: "10px"
								}} onClick={copyUrl}>Copy invite link</Button>
							</div>

							<Row id="main" className="flex-container" style={{ margin: 0, padding: 0 }}>
								<video id="my-video" ref={localVideoref} autoPlay muted style={{
									borderStyle: "solid",borderColor: "#bdbdbd",margin: "10px",objectFit: "fill",
									width: "100%",height: "100%"}}></video>
							</Row>
						</div>
					</div>
				}
			</div>
    </>
  )
}

export default Meeting
