import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import Link from 'next/link'
import { Input, Button, IconButton } from '@material-ui/core';
import React, {useState, useEffect} from "react";
import dynamic from 'next/dynamic'
export default function Home() {
  const [url, setUrl] = useState('');

  const handleChange = (e) => setUrl(e.target.value )

	const join = () => {
		if (url !== "") {
			var id = url.split("/")
			window.location.href = `/meeting/${id[id.length-1]}`
		} else {
			var id = Math.random().toString(36).substring(2, 7)
			window.location.href = `/meeting/${id}`
		}
	}


  return (
    <div className="container2">
    <div style={{fontSize: "14px", background: "white", width: "10%", textAlign: "center", margin: "auto", marginBottom: "10px"}}>
      Source code: 
      <IconButton style={{color: "black"}} onClick={() => window.location.href="https://github.com/0x5eba/Video-Meeting"}>
        {/* <GitHubIcon /> */}
      </IconButton>
    </div>
    
    <div>
      <h1 style={{ fontSize: "45px" }}>Video Meeting</h1>
      <p style={{ fontWeight: "200" }}>Video conference website that lets you stay in touch with all your friends.</p>
    </div>

    <div style={{
      background: "white", width: "30%", height: "auto", padding: "20px", minWidth: "400px",
      textAlign: "center", margin: "auto", marginTop: "100px"
    }}>
      <p style={{ margin: 0, fontWeight: "bold", paddingRight: "50px" }}>Start or join a meeting</p>
      <Input placeholder="URL" onChange={e => handleChange(e)} />
      <Button variant="contained" color="primary" onClick={join} style={{ margin: "20px" }}>Go</Button>
    </div>
  </div>
  )
}

{/* <ul>
<li>
  <Link href="/">
    <a>Home</a>
  </Link>
</li>
<li>
  <Link href="/about">
    <a>About Us</a>
  </Link>
</li>
<li>
  <Link href="/meeting/[id]" as={`/meeting/${id}`}>
    <a>Call</a>
  </Link>
</li>
</ul> */}

