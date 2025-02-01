

1. First, create a new directory for the SevOne feature:

mkdir -p envizi-integration-hub-app-main/web/src/app/sevone


2. Create the following files in the new directory:

```javascript:envizi-integration-hub-app-main/web/src/app/sevone/page.js
// Main page component as provided in previous response
```

```javascript:envizi-integration-hub-app-main/web/src/app/sevone/SevOneAPI.js
// API utility class for SevOne
export default class SevOneAPI {
  static async authenticate(apiUrl, username, password) {
    const response = await fetch(`${apiUrl}/authentication/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: username,
        password: password,
      }),
    });
    return response.json();
  }

  static async getDevices(apiUrl, token) {
    const response = await fetch(`${apiUrl}/devices`, {
      headers: {
        'X-AUTH-TOKEN': token,
      },
    });
    return response.json();
  }

  static async getDeviceDetails(apiUrl, token, deviceId) {
    const response = await fetch(`${apiUrl}/devices/${deviceId}?includeIndicators=true`, {
      headers: {
        'X-AUTH-TOKEN': token,
      },
    });
    return response.json();
  }
}
```



3. Add SevOne-specific styles to your CSS file:

```css:envizi-integration-hub-app-main/web/src/components/css/common.css
// ... existing styles ...

/* SevOne specific styles */
.sevone-metrics-container {
  background-color: #ffffff;
  padding: 15px;
  margin: 10px 0;
  border: 1px solid #e0e0e0;
}

.sevone-device-card {
  background-color: #f4f4f4;
  padding: 12px;
  margin: 8px 0;
  border-radius: 4px;
}

.sevone-metrics-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.sevone-metrics-table th,
.sevone-metrics-table td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.sevone-error-message {
  color: #da1e28;
  padding: 8px;
  margin: 8px 0;
  background-color: #fff1f1;
  border-left: 3px solid #da1e28;
}
```



4. Update the navigation by adding SevOne to the sidebar menu. Add this to your navigation component:

```javascript:envizi-integration-hub-app-main/web/src/components/Navigation/Navigation.js
// ... existing imports ...
import { Analytics } from '@carbon/react/icons';  // Add this import

const Navigation = () => {
  return (
    <HeaderNavigation aria-label="IBM [Platform]">
      // ... existing navigation items ...
      
      <HeaderMenuItem href="/sevone">
        <Analytics className="navigation-icon" />
        SevOne Integration
      </HeaderMenuItem>
      
      // ... rest of navigation ...
    </HeaderNavigation>
  );
};
```


5. Create a component for displaying device metrics:

```javascript:envizi-integration-hub-app-main/web/src/app/sevone/components/DeviceMetrics.js
import React from 'react';
import { Loading, Button } from 'carbon-components-react';
import { LineChart } from '@carbon/charts-react';

const DeviceMetrics = ({ device, metrics, loading, onRefresh }) => {
  if (loading) {
    return <Loading description="Loading metrics..." />;
  }

  const chartOptions = {
    title: 'Device Metrics',
    axes: {
      left: {
        title: 'Value',
        mapsTo: 'value'
      },
      bottom: {
        title: 'Time',
        mapsTo: 'date',
        scaleType: 'time'
      }
    },
    height: '400px'
  };

  return (
    <div className="sevone-metrics-container">
      <h3>Metrics for {device.name}</h3>
      <Button onClick={onRefresh}>Refresh Metrics</Button>
      
      {metrics && metrics.length > 0 ? (
        <LineChart
          data={metrics}
          options={chartOptions}
        />
      ) : (
        <p>No metrics available</p>
      )}
    </div>
  );
};

export default DeviceMetrics;
```


6. Add the necessary dependencies to your package.json:

```javascript:envizi-integration-hub-app-main/web/package.json
{
  "dependencies": {
    // ... existing dependencies ...
    "@carbon/charts": "^1.x.x",
    "@carbon/charts-react": "^1.x.x"
  }
}
```

7. Create a utility file for time-related functions:

```javascript:envizi-integration-hub-app-main/web/src/app/sevone/utils/timeUtils.js
export const getTimeRange = (hours = 1) => {
  const endTime = Date.now();
  const startTime = endTime - (hours * 60 * 60 * 1000);
  return {
    startTime,
    endTime
  };
};

export const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString();
};
```

8. Update your main page component to use these new components:

```javascript:envizi-integration-hub-app-main/web/src/app/sevone/page.js
// ... previous imports ...
import DeviceMetrics from './components/DeviceMetrics';
import SevOneAPI from './SevOneAPI';
import { getTimeRange, formatTimestamp } from './utils/timeUtils';

class SevOnePage extends Component {
  // ... previous code ...

  handleViewMetrics = async (deviceId) => {
    this.setState({ loading: true });
    try {
      const { startTime, endTime } = getTimeRange(1); // Last 1 hour
      const deviceDetails = await SevOneAPI.getDeviceDetails(
        this.state.apiUrl,
        this.state.authToken,
        deviceId
      );
      
      this.setState({
        selectedDevice: deviceDetails,
        metrics: deviceDetails.metrics,
        loading: false
      });
    } catch (error) {
      this.setState({
        error: 'Failed to fetch metrics: ' + error.message,
        loading: false
      });
    }
  };

  render() {
    // ... previous render code ...
    
    {this.state.selectedDevice && (
      <DeviceMetrics
        device={this.state.selectedDevice}
        metrics={this.state.metrics}
        loading={this.state.loading}
        onRefresh={() => this.handleViewMetrics(this.state.selectedDevice.id)}
      />
    )}
    
    // ... rest of render code ...
  }
}
```

9. Add the route to your Next.js configuration:

```javascript:envizi-integration-hub-app-main/web/src/app/layout.js
// ... existing imports ...

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* ... existing layout ... */}
        {children}
      </body>
    </html>
  );
}
```





Directory structure after adding all components:

envizi-integration-hub-app-main/web/
├── src/
│   ├── app/
│   │   ├── sevone/
│   │   │   ├── components/
│   │   │   │   └── DeviceMetrics.js
│   │   │   ├── utils/
│   │   │   │   └── timeUtils.js
│   │   │   ├── page.js
│   │   │   └── SevOneAPI.js
│   │   └── ...
│   ├── components/
│   │   ├── css/
│   │   │   └── common.css
│   │   └── Navigation/
│   │       └── Navigation.js
│   └── ...