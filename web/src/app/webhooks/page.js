'use client';
import React, { Component } from 'react';
import ApiUtility from '../../components/ApiUtility/ApiUtility';

import {
  Breadcrumb,
  BreadcrumbItem,
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  Pagination,
} from '@carbon/react';
import {
  Loading,
  TextInput,
  Button,
  Grid,
  Row,
  Column,
} from 'carbon-components-react';
import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Link,
} from '@carbon/react';
import { Add, TrashCan, Replicate, Edit, Run } from '@carbon/react/icons';

import CarbonTable from '../../components/CarbonTable/CarbonTable';

import '../../components/css/common.css'; // Import the CSS file for styling

class WebhookPage extends Component {
  constructor(props) {
    super(props);
    this.apiUtility = new ApiUtility();
    this.state = {
      loading: true,
      execution_result: null,
      template_columns: [],
      msg: null,
      webhooks: [],
      currentPage: 1,
      totalItems: 0,
      itemsPerPage: 5,
    };
  }

  componentDidMount() {
    this.handleLoad();
  }

  handlePageChange = (data) => {
    this.setState({ loading: true, currentPage: data.page }, () => {
      this.handleLoad();
    });
  };

  handleLoad = async () => {
    console.log('Loading page:', this.state.currentPage);
    
    try {
      const response = await fetch(`/api/webhook/list?page=${this.state.currentPage}&limit=${this.state.itemsPerPage}`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data && data.data) {
        this.setState({
          webhooks: data.data,
          totalItems: data.total,
          loading: false
        });
      } else {
        console.error('Invalid response format:', data);
        this.setState({ loading: false });
      }
    } catch (error) {
      console.error('Load failed:', error);
      this.setState({ loading: false });
    }
  };

  getRequest = async (url) => {
    try {
      const response = await this.apiUtility.getRequest(url);
      return response;
    } catch (error) {
      console.error('Error in getRequest:', error);
      throw error;
    }
  };

  getWebhookDetailLink(id) {
    return '/webhookdetail?action=load&id=' + id;
  }

  handleNew = () => {
    window.location.href = '/webhookdetail';
  };

  handleOpen = (id) => {
    window.location.href = '/webhookdetail?action=load&id=' + id;
  };

  handleClone = (id) => {
    window.location.href = '/webhookdetail?action=clone&id=' + id;
  };

  handleExecute = (id) => {
    this.postRequest(
      '/api/webhook/execute',
      this.startLoading,
      this.stopLoading,
      this.sucessCallBackExecute,
      id
    );
  };

  handleDelete = (id) => {
    this.postRequest(
      '/api/webhook/delete',
      this.startLoading,
      this.stopLoading,
      this.sucessCallBackDelete,
      id
    );
  };

  sucessCallBackExecute = (resp) => {
    this.setState((prevData) => {
      const newData = { ...prevData };
      newData.execution_result = resp.data;
      newData.template_columns = resp.template_columns;
      newData.msg = resp.msg;
      newData.loading = false;
      return newData;
    });
  };

  sucessCallBackDelete = (resp) => {
    this.setState((prevData) => {
      const newData = { ...prevData };
      newData.webhooks = resp.data;
      newData.msg = resp.msg;
      newData.loading = false;
      return newData;
    });
  };

  postRequest = (url, startCallBack, errorCallBack, sucesssCallBack, id) => {
    var myPayload = { id: id };
    this.apiUtility.postRequest(
      url,
      startCallBack,
      errorCallBack,
      sucesssCallBack,
      myPayload
    );
  };

  render() {
    const { loading, webhooks, currentPage, totalItems, itemsPerPage } = this.state;

    return (
      <Grid>
        <Column
          lg={16}
          md={8}
          sm={4}
          className="landing-page__banner my-title-image"
        >
          <span className="SubHeaderTitle">Webhook Integration</span>
        </Column>
        <Column lg={16} md={8} sm={4} className="landing-page__r2">
          <div className="my-component">
            <section className="top-section">
              <div className="text-sub-heading">Webhooks</div>
              <div className="text-sub-heading-label2">
                Manage your webhooks here
              </div>

              <div className="upload-section">
                <div className="fin-row">
                  <div className="fin-column">
                    <Button className="fin-button-1" onClick={this.handleNew}>
                      New
                    </Button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div>
                  <p>&nbsp;</p>
                  <Loading description="Loading content..." />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeader>Id</TableHeader>
                        <TableHeader>Name</TableHeader>
                        <TableHeader>Description</TableHeader>
                        <TableHeader>Type</TableHeader>
                        <TableHeader>Actions</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {webhooks.map((webhook) => (
                        <TableRow key={webhook.id}>
                          <TableCell>{webhook.id}</TableCell>
                          <TableCell>{webhook.name}</TableCell>
                          <TableCell>{webhook.desc}</TableCell>
                          <TableCell>{webhook.type}</TableCell>
                          <TableCell>
                            <Button
                              kind="ghost"
                              size="sm"
                              onClick={() => {
                                window.location.href = `/webhookdetail?id=${webhook.id}`;
                              }}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {webhooks.length > 0 && (
                    <div style={{ margin: '1rem 0' }}>
                      <Pagination
                        backwardText="Previous page"
                        forwardText="Next page"
                        itemsPerPageText="Items per page:"
                        page={currentPage}
                        pageNumberText="Page Number"
                        pageSize={itemsPerPage}
                        pageSizes={[5]}
                        totalItems={totalItems}
                        onChange={this.handlePageChange}
                      />
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </Column>

        <Column lg={16} md={8} sm={4} className="landing-page__r2">
          <div className="my-component">
            {this.state.execution_result && (
              <section className="top-section">
                <div className="text-sub-heading">Webhook Execution Result</div>
                <div className="text-sub-heading-label2">
                  Webhook Execution results
                </div>

                <div className="upload-section">
                  {this.state.execution_result && (
                    <CarbonTable
                      columns={this.state.template_columns}
                      jsonData={this.state.execution_result}
                      headingText1={'Data Ingested'}
                      headingText2={'The below data have been pushed to Envizi'}
                    />
                  )}
                </div>
              </section>
            )}
          </div>
        </Column>
      </Grid>
    );
  }
}
export default WebhookPage;
