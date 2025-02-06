'use client';
import React, { Component } from 'react';
import {
  HeaderContainer,
  HeaderMenuButton,
  Button,
} from '@carbon/react';
import Image from 'next/image';

class AppHeader extends Component {
  render() {
    return (
      <div aria-label="Tech Mahindra INDRA" className="HeaderClass">
        <div className="containerHeading">
          <div className="logoSection">
            <Image 
              src="/images/tech-mahindra-logo.svg"
              alt="Tech Mahindra Logo"
              width={140}
              height={35}
              priority
              className="headerLogo"
            />
            <span className="divider"></span>
            <span className="appTitle">INDRA</span>
          </div>
          <nav className="navigationMenu">
            <Button className="navButton" href="/">Home</Button>
            <Button className="navButton" href="/turbo">Turbonomic</Button>
            <Button className="navButton" href="/excelpro">Excel</Button>
            <Button className="navButton" href="/webhooks">Webhooks</Button>
            <Button className="navButton" href="/invoice">Invoice</Button>
            <Button className="navButton" href="/config">Config</Button>
          </nav>
        </div>
      </div>
    );
  }
}

export default AppHeader;
