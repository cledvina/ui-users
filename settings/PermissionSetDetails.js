// We have to remove node_modules/react to avoid having multiple copies loaded.
// eslint-disable-next-line import/no-unresolved
import React from 'react';

import Pane from '@folio/stripes-components/lib/Pane';
import Textfield from '@folio/stripes-components/lib/TextField';
import TextArea from '@folio/stripes-components/lib/TextArea';

import { Field, reduxForm } from 'redux-form';

import UserPermissions from '../UserPermissions';

const PermissionSetDetails = () =>
  <Pane paneTitle="Patron Groups" defaultWidth="fill" >
    <form>
      <section>
        <h2 style={{ marginTop: '0' }}>About</h2>
        <Field label="Title" name="title" id="permissionset_title" component={Textfield} required fullWidth />
        <Field label="Description" name="description" id="permissionset_description" component={TextArea} required fullWidth />
      </section>
      <UserPermissions {...this.props} availablePermissions={[]} />
    </form>
  </Pane>;

export default reduxForm({
  form: 'permissionSetForm',
})(PermissionSetDetails);
