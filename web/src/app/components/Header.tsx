'use client';

import { Header, HeaderNavigation, HeaderMenuItem } from '@carbon/react';
import Image from 'next/image';
import styles from './Header.module.css';

/**export default function AppHeader() {
  return (
    <Header aria-label="Envizi Data Integration" className="cds--header">
      <HeaderName prefix="">
        Envizi Data Integration
      </HeaderName>
      <HeaderNavigation aria-label="Main Navigation">
        <HeaderMenuItem href="/webhooks" className="cds--header__menu-item">
          Webhooks
        </HeaderMenuItem>
        <HeaderMenuItem href="/invoice" className="cds--header__menu-item">
          Invoices
        </HeaderMenuItem>
        <HeaderMenuItem href="/turbo" className="cds--header__menu-item">
          Turbo
        </HeaderMenuItem>
      </HeaderNavigation>
    </Header>
  );
}*/ 

export default function AppHeader() {
  return (
    <Header aria-label="Tech Mahindra INDRA" className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.brandSection}>
          
          <span className={styles.divider}></span>
          <span className={styles.headerTitle}>INDRA</span>
        </div>
        <HeaderNavigation aria-label="Main Navigation" className={styles.navigation}>
          <HeaderMenuItem href="/webhooks">Webhooks</HeaderMenuItem>
          <HeaderMenuItem href="/invoice">Invoices</HeaderMenuItem>
          <HeaderMenuItem href="/turbo">Turbo</HeaderMenuItem>
        </HeaderNavigation>
      </div>
    </Header>
  );
} 