import React from 'react';
import {
  Button,
  Dropdown,
  Form,
  Header,
  Icon,
  Input,
  Label,
  Popup,
  Select,
} from 'semantic-ui-react';
import {
  addFilter,
  deleteFilter,
  editFilter,
  setFilterComponent,
} from '../actions/run';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import Autosuggest from 'react-autosuggest';
import _ from 'lodash';
import RunFieldSelector from '../components/RunFieldSelector';
import {
  sortableValue,
  displayValue,
  getRunValueFromFilterKey,
} from '../util/runhelpers.js';

import './RunFilters.css';

class RunFilterEditor extends React.Component {
  componentWillMount() {
    this.setupValueSuggestions(this.props);
  }

  getValueSuggestions(props) {
    let options = _.uniq(
      props.runs.map(run =>
        sortableValue(getRunValueFromFilterKey(run, props.filterKey)),
      ),
    )
      .filter(v => v)
      .sort();
    if (!_.isNil(this.props.filterKey) && this.props.op === '=') {
      options.unshift('*');
    }
    return options.map(option => ({
      key: option,
      text: option,
      value: option,
    }));
  }

  setupValueSuggestions(props) {
    this.valueSuggestions = this.getValueSuggestions(props);
    if (!this.props.value && this.valueSuggestions.length > 0) {
      this.props.setFilterComponent(
        this.props.kind,
        this.props.id,
        'value',
        this.valueSuggestions[0].value,
      );
    }
  }

  componentWillReceiveProps(nextProps) {
    this.setupValueSuggestions(nextProps);
  }

  render() {
    let operators = ['=', '!=', '>=', '<='].map(op => ({text: op, value: op}));
    return (
      <Form>
        <Form.Field>
          <RunFieldSelector
            options={this.props.keySuggestions}
            inputProps={{
              placeholder: 'key',
              value: this.props.filterKey ? this.props.filterKey.value : '',
              onChange: e =>
                this.props.setFilterComponent(
                  this.props.kind,
                  this.props.id,
                  'key',
                  {
                    section: 'config',
                    value: e.target.value,
                  },
                ),
            }}
            onSelected={suggestion => {
              this.props.setFilterComponent(
                this.props.kind,
                this.props.id,
                'key',
                suggestion,
              );
              // HACK: Autosuggest renders at the top-level rather than as a descendent
              // of the FilterEditor. Clicking on an element in the Autosuggest causes
              // FilterEditor to lose focus so it closes. We reopen it here. There's
              // probably a better way to fix this!
              setTimeout(() => {
                this.props.editFilter(this.props.id);
              }, 0);
            }}
          />
        </Form.Field>
        <Form.Field>
          <Select
            options={operators}
            placeholder={'operator'}
            value={this.props.op}
            onChange={(e, {value}) => {
              this.props.setFilterComponent(
                this.props.kind,
                this.props.id,
                'op',
                value,
              );
            }}
          />
        </Form.Field>
        {this.props.op === '=' || this.props.op === '!=' ? (
          <Form.Field>
            <Dropdown
              options={this.valueSuggestions}
              placeholder="value"
              search
              selection
              fluid
              value={this.props.value}
              onChange={(e, {value}) => {
                this.props.setFilterComponent(
                  this.props.kind,
                  this.props.id,
                  'value',
                  value,
                );
              }}
            />
          </Form.Field>
        ) : (
          <Form.Input
            value={this.props.value}
            onChange={(e, {value}) => {
              this.props.setFilterComponent(
                this.props.kind,
                this.props.id,
                'value',
                value,
              );
            }}
          />
        )}
      </Form>
    );
  }
}

const mapRunFilterEditorStateToProps = (state, ownProps) => {
  let filter = state.runs.filters[ownProps.kind][ownProps.id];
  return {
    id: filter.id,
    filterKey: filter.key,
    op: filter.op,
    value: filter.value,
  };
};

const runFilterEditorMapDispatchToProps = (dispatch, ownProps) => {
  return bindActionCreators({editFilter, setFilterComponent}, dispatch);
};

RunFilterEditor = connect(
  mapRunFilterEditorStateToProps,
  runFilterEditorMapDispatchToProps,
)(RunFilterEditor);

class RunFilter extends React.Component {
  componentDidMount() {
    // We want newly added filters to be in the editing state by default. But semantic-ui-react's
    // popup implementation is broken and needs an initial click in order to get the correct
    // position of the popup. Without the initial click it renders the popup at the top of the
    // page.
    // I tried using react's ref mechanism, by creating my own component to pass to the popup
    // trigger, but popup's don't seem to work with custom components that I make, the popup
    // simply never opens, no idea why.
    // So we resort to good old fashined document.getElementById.
    // setTimeout is needed because the click triggers onClose on the previously opened
    // popup, which blindly closes whatever's open.
    if (!this.props.filterKey) {
      setTimeout(
        () =>
          document.getElementById('runFilterViewer' + this.props.id).click(),
        1,
      );
    }
  }
  componentWillUnmount() {
    this.props.editFilter(null);
  }
  render() {
    return (
      <Popup
        trigger={
          <span>
            <Button.Group
              className="runFilterViewer"
              style={{marginRight: 12, marginTop: 8}}
              size="tiny">
              <Button className="filter" id={'runFilterViewer' + this.props.id}>
                <span>
                  {this.props.filterKey ? (
                    this.props.filterKey.section +
                    ':' +
                    this.props.filterKey.value
                  ) : (
                    '_'
                  )}
                </span>{' '}
                <span>{this.props.op ? this.props.op : '_'}</span>{' '}
                <span>
                  {this.props.value ? displayValue(this.props.value) : '_'}
                </span>
              </Button>
              <Button
                negative
                className="delete"
                icon="trash"
                onClick={e => {
                  // prevents triggering Popup click event, that will cause "onOpen" event to be called
                  e.stopPropagation();
                  this.props.deleteFilter(this.props.kind, this.props.id);
                }}
              />
            </Button.Group>
          </span>
        }
        on="click"
        content={
          <RunFilterEditor
            runs={this.props.runs}
            keySuggestions={this.props.keySuggestions}
            kind={this.props.kind}
            id={this.props.id}
          />
        }
        open={this.props.editing}
        onOpen={() => this.props.editFilter(this.props.id)}
        onClose={() => this.props.editFilter(null)}
        position="bottom center"
        flowing
      />
    );
  }
}

const mapRunFilterStateToProps = (state, ownProps) => {
  let filter = state.runs.filters[ownProps.kind][ownProps.id];
  return {
    editing: state.runs.editingFilter == ownProps.id,
    id: filter.id,
    filterKey: filter.key,
    op: filter.op,
    value: filter.value,
  };
};

const runFilterMapDispatchToProps = (dispatch, ownProps) => {
  return bindActionCreators({deleteFilter, editFilter}, dispatch);
};

RunFilter = connect(mapRunFilterStateToProps, runFilterMapDispatchToProps)(
  RunFilter,
);

class RunFilters extends React.Component {
  render() {
    let filterIDs = _.keys(this.props.filters).sort();
    return (
      <div>
        <div className="input-style">
          {filterIDs.map(filterID => {
            let filter = this.props.filters[filterID];
            return (
              <RunFilter
                kind={this.props.kind}
                runs={this.props.runs}
                key={filter.id}
                id={filter.id}
                keySuggestions={this.props.keySuggestions}
              />
            );
          })}
          <Button
            icon="plus"
            circular
            content={this.props.buttonText}
            style={{marginTop: 8}}
            size="tiny"
            onClick={() => {
              this.props.addFilter(this.props.kind, '', '=', '');
            }}
          />
        </div>
      </div>
    );
  }
}

function mapStateToProps(state, ownProps) {
  return {
    editingFilter: state.runs.editingFilter,
    filters: state.runs.filters[ownProps.kind],
  };
}

const mapDispatchToProps = (dispatch, ownProps) => {
  return bindActionCreators({addFilter, editFilter}, dispatch);
};

export default connect(mapStateToProps, mapDispatchToProps)(RunFilters);