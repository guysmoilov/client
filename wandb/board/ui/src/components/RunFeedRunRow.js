import React, {PureComponent} from 'react';
import {Checkbox, Icon, Table} from 'semantic-ui-react';
import ValueDisplay from './RunFeedValueDisplay';
import {makeShouldUpdate} from '../util/shouldUpdate';
import * as Selection from '../util/selections';
import * as Filter from '../util/filters';
import RunFeedDescription from './RunFeedDescription';
import {getRunValue} from '../util/runhelpers.js';
import ContentLoader from 'react-content-loader';

export default class RunFeedRunRow extends React.Component {
  constructor(props) {
    super(props);
    // This seems like it would be expensive but it's not (.5ms on a row with ~100 columns)
    this._shouldUpdate = makeShouldUpdate({
      name: 'RunRow',
      deep: ['run', 'selectedRuns', 'columnNames'],
      ignoreFunctions: true,
      debug: false,
    });
  }

  shouldComponentUpdate(nextProps, nextState) {
    return this._shouldUpdate(
      this.props,
      nextProps,
      this.props.run ? this.props.run.name : 'loading'
    );
  }

  render() {
    if (this.props.loading) {
      return (
        <Table.Row key="loading">
          {this.props.columnNames.map(columnName => {
            switch (columnName) {
              case 'Description':
                return (
                  this.props.descriptionHeight && (
                    <Table.Cell>
                      <ContentLoader
                        style={{height: 43}}
                        height={63}
                        width={350}
                        speed={2}
                        primaryColor={'#f3f3f3'}
                        secondaryColor={'#e3e3e3'}>
                        <circle cx="32" cy="32" r="30" />
                        <rect
                          x="75"
                          y="13"
                          rx="4"
                          ry="4"
                          width="270"
                          height="13"
                        />
                        <rect
                          x="75"
                          y="40"
                          rx="4"
                          ry="4"
                          width="50"
                          height="8"
                        />
                      </ContentLoader>
                    </Table.Cell>
                  )
                );
              case 'Subgroup':
                return (
                  <Table.Cell>
                    <ContentLoader height={20} />
                  </Table.Cell>
                );
              default:
                return <Table.Cell collapsing>-</Table.Cell>;
            }
          })}
        </Table.Row>
      );
    }

    let {
      run,
      loading,
      columnNames,
      project,

      descriptionHeight,
      subgroupHeight,

      groupKey,
      subgroupKey,

      subgroupCount,
      runCount,
      subgroupClick,
      runsClick,
      subgroupOpen,
      runsOpen,

      showSubgroup,
      subgroupRunsClick,
      subgroupRunsOpen,
      subgroupRunCount,

      selections,
      setFilters,
      addFilter,
    } = this.props;
    const summary = run.summary;
    const config = run.config;
    const selected = selections && Filter.match(selections, run);
    return (
      <Table.Row key={run.id}>
        {columnNames.map(columnName => {
          switch (columnName) {
            case 'Select':
              return (
                <Table.Cell collapsing>
                  <Checkbox
                    checked={selected}
                    onChange={() => {
                      if (selected) {
                        selections = Selection.Update.deselect(
                          selections,
                          run.name
                        );
                      } else {
                        selections = Selection.Update.select(
                          selections,
                          run.name
                        );
                      }
                      this.props.setFilters('select', selections);
                    }}
                  />
                </Table.Cell>
              );
            case 'Description':
              const descProps = {
                loading,
                project,
                run,
                addFilter,
                subgroupCount,
                runCount,
                subgroupClick,
                runsClick,
                subgroupOpen,
                runsOpen,
                rowSpan: descriptionHeight,
              };
              return descriptionHeight && <RunFeedDescription {...descProps} />;
            case 'Subgroup':
              return (
                subgroupHeight && (
                  <Table.Cell collapsing rowSpan={subgroupHeight}>
                    {showSubgroup ? (
                      <div>
                        {run.config[subgroupKey]}
                        <a
                          style={{cursor: 'pointer'}}
                          onClick={() =>
                            subgroupRunsClick && subgroupRunsClick()
                          }>
                          <Icon
                            rotated={!subgroupRunsOpen && 'counterclockwise'}
                            name="dropdown"
                          />
                          {subgroupRunCount} Runs
                        </a>
                      </div>
                    ) : (
                      '-'
                    )}
                  </Table.Cell>
                )
              );
            case 'Ran':
              return (
                <Table.Cell key={columnName} collapsing>
                  <TimeAgo date={new Date(run.createdAt)} />
                </Table.Cell>
              );
            case 'Runtime':
              return (
                <Table.Cell key={columnName} collapsing>
                  {run.heartbeatAt && (
                    <TimeAgo
                      date={new Date(run.createdAt)}
                      now={() => new Date(run.heartbeatAt)}
                      formatter={(v, u, s, d, f) => f().replace(s, '')}
                      live={false}
                    />
                  )}
                </Table.Cell>
              );
            default:
              let [section, key] = columnName.split(':');
              return (
                <Table.Cell
                  key={columnName}
                  style={{
                    maxWidth: 200,
                    direction: 'rtl',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                  collapsing>
                  <ValueDisplay
                    section={section}
                    valKey={key}
                    value={getRunValue(run, columnName)}
                    justValue
                    addFilter={addFilter}
                  />
                </Table.Cell>
              );
          }
        })}
      </Table.Row>
    );
  }
}