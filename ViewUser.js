import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Pane from '@folio/stripes-components/lib/Pane';
import PaneMenu from '@folio/stripes-components/lib/PaneMenu';
import Button from '@folio/stripes-components/lib/Button';
import KeyValue from '@folio/stripes-components/lib/KeyValue';
import { Row, Col } from 'react-bootstrap';
import MultiColumnList from '@folio/stripes-components/lib/MultiColumnList';
import Icon from '@folio/stripes-components/lib/Icon';
import Layer from '@folio/stripes-components/lib/Layer';
import IfPermission from '@folio/stripes-components/lib/IfPermission';
import IfInterface from '@folio/stripes-components/lib/IfInterface';

import UserForm from './UserForm';
import UserPermissions from './UserPermissions';
import UserLoans from './UserLoans';
import LoansHistory from './LoansHistory';
import LoanActionsHistory from './LoanActionsHistory';
import contactTypes from './data/contactTypes';
import UserAddresses from './lib/UserAddresses';
import { toListAddresses, toUserAddresses } from './converters/address';

class ViewUser extends React.Component {

  static propTypes = {
    stripes: PropTypes.shape({
      hasPerm: PropTypes.func.isRequired,
      connect: PropTypes.func.isRequired,
      locale: PropTypes.string.isRequired,
      logger: PropTypes.shape({
        log: PropTypes.func.isRequired,
      }).isRequired,
    }).isRequired,
    paneWidth: PropTypes.string.isRequired,
    data: PropTypes.shape({
      user: PropTypes.arrayOf(PropTypes.object),
      patronGroups: PropTypes.arrayOf(PropTypes.object),
      editMode: PropTypes.shape({
        mode: PropTypes.bool,
      }),
    }),
    mutator: React.PropTypes.shape({
      selUser: React.PropTypes.shape({
        PUT: React.PropTypes.func.isRequired,
      }),
      editMode: PropTypes.shape({
        replace: PropTypes.func,
      }),
    }),
    match: PropTypes.shape({
      path: PropTypes.string.isRequired,
    }).isRequired,
    onClose: PropTypes.func,
    okapi: PropTypes.object,
  };

  static manifest = Object.freeze({
    editMode: { initialValue: { mode: false } },
    selUser: {
      type: 'okapi',
      path: 'users/:{userid}',
      clear: false,
    },
    patronGroups: {
      type: 'okapi',
      path: 'groups',
      records: 'usergroups',
    },
  });

  constructor(props) {
    super(props);
    this.state = {
      viewLoansHistoryMode: false,
      viewLoanActionsHistoryMode: false,
      selectedLoan: {},
      lastUpdate: null,
    };
    this.onClickEditUser = this.onClickEditUser.bind(this);
    this.onClickCloseEditUser = this.onClickCloseEditUser.bind(this);
    this.connectedUserLoans = props.stripes.connect(UserLoans);
    this.connectedLoansHistory = props.stripes.connect(LoansHistory);
    this.connectedLoanActionsHistory = props.stripes.connect(LoanActionsHistory);
    this.connectedUserPermissions = props.stripes.connect(UserPermissions);
    this.dateLastUpdated = this.dateLastUpdated.bind(this);
    this.onClickViewLoansHistory = this.onClickViewLoansHistory.bind(this);
    this.onClickCloseLoansHistory = this.onClickCloseLoansHistory.bind(this);
    this.onClickViewLoanActionsHistory = this.onClickViewLoanActionsHistory.bind(this);
    this.onClickCloseLoanActionsHistory = this.onClickCloseLoanActionsHistory.bind(this);
    this.onAddressesUpdate = this.onAddressesUpdate.bind(this);
  }

  // EditUser Handlers
  onClickEditUser(e) {
    if (e) e.preventDefault();
    this.props.stripes.logger.log('action', 'clicked "edit user"');
    this.props.mutator.editMode.replace({ mode: true });
  }

  onClickCloseEditUser(e) {
    if (e) e.preventDefault();
    this.props.stripes.logger.log('action', 'clicked "close edit user"');
    this.props.mutator.editMode.replace({ mode: false });
  }

  onClickViewLoansHistory(e) {
    if (e) e.preventDefault();
    this.setState({
      viewLoansHistoryMode: true,
    });
  }

  onClickCloseLoansHistory(e) {
    if (e) e.preventDefault();
    this.setState({
      viewLoansHistoryMode: false,
    });
  }

  onClickViewLoanActionsHistory(e, selectedLoan) {
    if (e) e.preventDefault();
    this.setState({
      viewLoanActionsHistoryMode: true,
      selectedLoan,
    });
  }

  onClickCloseLoanActionsHistory(e) {
    if (e) e.preventDefault();
    this.setState({
      viewLoanActionsHistoryMode: false,
      selectedLoan: {},
    });
  }

  onAddressesUpdate(addresses) {
    const user = this.getUser();
    if (!user) return;
    user.personal.addresses = addresses;
    this.update(user);
  }

  getUser() {
    const { data: { selUser }, match: { params: { userid } } } = this.props;
    if (!selUser || selUser.length === 0 || !userid) return null;
    const user = selUser.find(u => u.id === userid);
    return user ? _.cloneDeep(user) : user;
  }

  update(data) {
    if (data.personal.addresses) {
      data.personal.addresses = toUserAddresses(data.personal.addresses); // eslint-disable-line no-param-reassign
    }

    // eslint-disable-next-line no-param-reassign
    if (data.creds) delete data.creds; // not handled on edit (yet at least)
    this.props.mutator.selUser.PUT(data).then(() => {
      this.setState({
        lastUpdate: new Date().toISOString(),
      });
      this.onClickCloseEditUser();
    });
  }

  // This is a helper function for the "last updated" date element. Since the
  // date/time is actually set on the server when the record is updated, the
  // lastUpdated element of the record on the client side might contain a stale
  // value. If so, this returns a locally stored update date until the data
  // is refreshed.
  dateLastUpdated(user) {
    const updatedDateRec = _.get(user, ['updatedDate'], '');
    const updatedDateLocal = this.state.lastUpdate;

    if (!updatedDateRec) { return ''; }

    let dateToShow;
    if (updatedDateLocal && updatedDateLocal > updatedDateRec) {
      dateToShow = updatedDateLocal;
    }
    else {
      dateToShow = updatedDateRec;
    }

    return new Date(dateToShow).toLocaleString(this.props.stripes.locale);
  }

  render() {
    const dueDate = new Date(Date.parse('2014-11-12')).toLocaleDateString(this.props.stripes.locale);
    const fineHistory = [{ 'Due Date': dueDate, Amount: '34.23', Status: 'Unpaid' }];
    const { data: { patronGroups } } = this.props;
    const user = this.getUser();

    const detailMenu = (<PaneMenu>
      <IfPermission perm="users.item.put">
        <button onClick={this.onClickEditUser} title="Edit User"><Icon icon="edit" />Edit</button>
      </IfPermission>
    </PaneMenu>);

    if (!user) return <div />;

    const userStatus = (_.get(user, ['active'], '') ? 'active' : 'inactive');
    const patronGroupId = _.get(user, ['patronGroup'], '');
    const patronGroup = patronGroups.find(g => g.id === patronGroupId) || { group: '' };
    const preferredContact = contactTypes.find(g => g.id === _.get(user, ['personal', 'preferredContactTypeId'], '')) || { type: '' };
    const addresses = toListAddresses(_.get(user, ['personal', 'addresses'], []));

    return (
      <Pane defaultWidth={this.props.paneWidth} paneTitle="User Details" lastMenu={detailMenu} dismissible onClose={this.props.onClose}>
        <Row>
          <Col xs={7} >
            <Row>
              <Col xs={12}>
                <h2>{_.get(user, ['personal', 'lastName'], '')}, {_.get(user, ['personal', 'firstName'], '')} {_.get(user, ['personal', 'middleName'], '')}</h2>
              </Col>
            </Row>
            <Row>
              <Col xs={12}>
                <KeyValue label="User ID" value={_.get(user, ['username'], '')} />
              </Col>
            </Row>
            <br />
            <Row>
              <Col xs={12}>
                <KeyValue label="Status" value={userStatus} />
              </Col>
            </Row>
            <br />
            <Row>
              <Col xs={12}>
                <KeyValue label="Email" value={_.get(user, ['personal', 'email'], '')} />
              </Col>
            </Row>
            <br />
            <Row>
              <Col xs={12}>
                <KeyValue label="Phone" value={_.get(user, ['personal', 'phone'], '')} />
              </Col>
            </Row>
            <br />
            <Row>
              <Col xs={12}>
                <KeyValue label="Mobile phone" value={_.get(user, ['personal', 'mobilePhone'], '')} />
              </Col>
            </Row>
            <br />
            <Row>
              <Col xs={12}>
                <KeyValue label="Preferred contact" value={preferredContact.desc} />
              </Col>
            </Row>
            <br />
            <Row>
              <Col xs={12}>
                <KeyValue label="Date of birth" value={(_.get(user, ['personal', 'dateOfBirth'], '')) ? new Date(Date.parse(_.get(user, ['personal', 'dateOfBirth'], ''))).toLocaleDateString(this.props.stripes.locale) : ''} />
              </Col>
            </Row>
          </Col>
          <Col xs={5} >
            <Row>
              <Col xs={12}>
                <img className="floatEnd" src="http://placehold.it/175x175" role="presentation" />
              </Col>
            </Row>
            <br />
            <Row>
              <Col xs={12}>
                <KeyValue label="Date enrolled" value={(_.get(user, ['enrollmentDate'], '')) ? new Date(Date.parse(_.get(user, ['enrollmentDate'], ''))).toLocaleDateString(this.props.stripes.locale) : ''} />
              </Col>
            </Row>
            <Row>
              <Col xs={12}>
                <KeyValue label="Expiration date" value={(_.get(user, ['expirationDate'], '')) ? new Date(Date.parse(_.get(user, ['expirationDate'], ''))).toLocaleDateString(this.props.stripes.locale) : ''} />
              </Col>
            </Row>
            <Row>
              <Col xs={12}>
                <KeyValue label="Open date" value={(_.get(user, ['createdDate'], '')) ? new Date(Date.parse(_.get(user, ['createdDate'], ''))).toLocaleString(this.props.stripes.locale) : ''} />
              </Col>
            </Row>
            <Row>
              <Col xs={12}>
                <KeyValue label="Record last updated" value={this.dateLastUpdated(user)} />
              </Col>
            </Row>
            <Row>
              <Col xs={12}>
                <KeyValue label="Bar code" value={_.get(user, ['barcode'], '')} />
              </Col>
            </Row>
            <Row>
              <Col xs={12}>
                <KeyValue label="FOLIO record number" value={_.get(user, ['id'], '')} />
              </Col>
            </Row>
            <Row>
              <Col xs={12}>
                <KeyValue label="External System ID" value={_.get(user, ['externalSystemId'], '')} />
              </Col>
            </Row>
            <br />
            <Row>
              <Col xs={12}>
                <KeyValue label="Patron group" value={patronGroup.group} />
              </Col>
            </Row>
          </Col>
        </Row>
        <UserAddresses onUpdate={this.onAddressesUpdate} addresses={addresses} />
        <br />
        <hr />
        <br />
        <Row>
          <Col xs={7} sm={6}>
            <h3 className="marginTopHalf">Fines</h3>
          </Col>
          <Col xs={5} sm={6}>
            <Button align="end" bottomMargin0 >View Full History</Button>
          </Col>
        </Row>
        <MultiColumnList fullWidth contentData={fineHistory} />
        <hr />
        <IfPermission perm="circulation.loans.collection.get">
          <IfInterface name="circulation" version="1.0">
            <this.connectedUserLoans onClickViewLoanActionsHistory={this.onClickViewLoanActionsHistory} onClickViewLoansHistory={this.onClickViewLoansHistory} {...this.props} />
          </IfInterface>
        </IfPermission>
        <IfPermission perm="perms.users.get">
          <IfInterface name="permissions" version="4.0">
            <this.connectedUserPermissions stripes={this.props.stripes} match={this.props.match} {...this.props} />
          </IfInterface>
        </IfPermission>
        <Layer isOpen={this.props.data.editMode ? this.props.data.editMode.mode : false} label="Edit User Dialog">
          <UserForm
            initialValues={user}
            onSubmit={(record) => { this.update(record); }}
            onCancel={this.onClickCloseEditUser}
            okapi={this.props.okapi}
            optionLists={{ patronGroups: this.props.data.patronGroups, contactTypes }}
          />
        </Layer>
        <Layer isOpen={this.state.viewLoansHistoryMode} label="Loans History">
          <this.connectedLoansHistory userid={user.id} stripes={this.props.stripes} onCancel={this.onClickCloseLoansHistory} />
        </Layer>
        <Layer isOpen={this.state.viewLoanActionsHistoryMode} label="Loans Actions History">
          <this.connectedLoanActionsHistory user={user} loan={this.state.selectedLoan} stripes={this.props.stripes} onCancel={this.onClickCloseLoanActionsHistory} />
        </Layer>
      </Pane>
    );
  }
}

export default ViewUser;
