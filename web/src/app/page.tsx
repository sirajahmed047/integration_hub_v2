'use client';

import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  Grid,
  Column,
  TableRow,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableCell,
} from '@carbon/react';

import {
  Advocate,
  Globe,
  AcceleratingTransformation,
} from '@carbon/pictograms-react';
import Image from 'next/image';
import archImage from '../components/images/arch.png'; // Import the CSS file for styling
import '../components/css/common.css'; // Import the CSS file for styling
import styles from './page.module.css'; // Add this import

export default function LandingPage() {
  return (
    <Grid className={styles.landingPage} fullWidth>
      <Column lg={16} md={8} sm={4}>
        <div className={styles.welcomeSection}>
          
          <div className={styles.titleSection}>
            <h1 className={styles.title}>INDRA</h1>
            <h2 className={styles.subtitle}>Integrated eNergy Data Reporting & Analytics</h2>
            <p className={styles.description}>
              Solution Accelerator for IBM Envizi
            </p>
          </div>
          
          <div className={styles.archSection}>
            <Image 
              src={archImage}
              alt="Architecture Diagram"
              className={styles.archImage}
              priority
            />
            
            <div className={styles.archDescription}>
              <h3>Architecture Overview</h3>
              <p>INDRA serves as a central platform for connecting various ESG data sources to IBM Envizi:</p>
              <ul>
                <li><strong>Data Sources:</strong> Support for Turbonomic, Webhooks, Excel files, and Utility Bills</li>
                <li><strong>Agents:</strong> Specialized agents for each data source handle data collection and preprocessing</li>
                <li><strong>Data Transformation:</strong> Standardizes data format for Envizi compatibility</li>
                <li><strong>Secure Transfer:</strong> Data is securely transmitted to IBM Envizi via Amazon S3</li>
              </ul>
            </div>
          </div>
        </div>
      </Column>
    </Grid>
  );
}
