import * as Filter from './filters';
import * as Run from './runs';

let runs: Run.Run[];

beforeAll(() => {
  runs = [
    {
      id: 'id-shawn',
      name: 'name0',
      state: 'running',
      user: {username: 'shawn', photoUrl: 'aphoto.com'},
      host: 'angry.local',
      createdAt: new Date(2018, 2, 22),
      heartbeatAt: new Date(2018, 2, 22, 1),
      tags: ['good', 'baseline'],
      description: 'shawn-run\nSome interesting info',
      config: {lr: 0.9, momentum: 0.95},
      summary: {acc: 0.72, loss: 0.12},
    },
    {
      id: 'id-brian',
      name: 'name1',
      state: 'running',
      user: {username: 'brian', photoUrl: 'bphoto.com'},
      host: 'brian.local',
      createdAt: new Date(2018, 2, 23),
      heartbeatAt: new Date(2018, 2, 23, 1),
      tags: [],
      description: 'fancy',
      config: {lr: 0.6, momentum: 0.95},
      summary: {acc: 0.8, loss: 0.05},
    },
    {
      id: 'id-lindsay',
      name: 'name2',
      state: 'failed',
      user: {username: 'lindsay', photoUrl: 'lphoto.com'},
      host: 'linsday.local',
      createdAt: new Date(2018, 2, 24),
      heartbeatAt: new Date(2018, 2, 24, 1),
      tags: ['hidden'],
      description: 'testrun\nJust testing some stuff',
      config: {lr: 0.7, momentum: 0.94, testparam: 'yes'},
      summary: {acc: 0.85},
    },
  ];
});

describe('Individual Filter', () => {
  it('name =', () => {
    const filter: Filter.Filter = {
      key: Run.key('run', 'name'),
      op: '=',
      value: 'shawn-run',
    };
    const result = Filter.filterRuns(filter, runs);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({id: 'id-shawn'});
  });

  it('state !=', () => {
    const filter: Filter.Filter = {
      key: Run.key('run', 'state'),
      op: '!=',
      value: 'failed',
    };
    const result = Filter.filterRuns(filter, runs);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({id: 'id-shawn'});
    expect(result[1]).toMatchObject({id: 'id-brian'});
  });

  it('config >=', () => {
    const filter: Filter.Filter = {
      key: Run.key('config', 'lr'),
      op: '>=',
      value: 0.7,
    };
    const result = Filter.filterRuns(filter, runs);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({id: 'id-brian'});
    expect(result[1]).toMatchObject({id: 'id-lindsay'});
  });

  it('config <=', () => {
    const filter: Filter.Filter = {
      key: Run.key('config', 'lr'),
      op: '<=',
      value: 0.7,
    };
    const result = Filter.filterRuns(filter, runs);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({id: 'id-shawn'});
    expect(result[1]).toMatchObject({id: 'id-lindsay'});
  });

  it('summary <', () => {
    const filter: Filter.Filter = {
      key: Run.key('summary', 'loss'),
      op: '<',
      value: 0.1,
    };
    const result = Filter.filterRuns(filter, runs);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({id: 'id-shawn'});
  });

  it('summary >', () => {
    const filter: Filter.Filter = {
      key: Run.key('summary', 'loss'),
      op: '>',
      value: 0.1,
    };
    const result = Filter.filterRuns(filter, runs);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({id: 'id-brian'});
  });
});

describe('Group Filter', () => {
  it('AND', () => {
    const filter: Filter.Filter = {
      op: 'AND',
      filters: [
        {key: Run.key('run', 'state'), op: '=', value: 'running'},
        {key: Run.key('run', 'host'), op: '=', value: 'brian.local'},
      ],
    };
    const result = Filter.filterRuns(filter, runs);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({id: 'id-brian'});
  });

  it('OR', () => {
    const filter: Filter.Filter = {
      op: 'OR',
      filters: [
        {key: Run.key('run', 'host'), op: '=', value: 'angry.local'},
        {key: Run.key('run', 'host'), op: '=', value: 'brian.local'},
      ],
    };
    const result = Filter.filterRuns(filter, runs);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({id: 'id-shawn'});
    expect(result[1]).toMatchObject({id: 'id-brian'});
  });

  it('OR of AND', () => {
    const filter: Filter.Filter = {
      op: 'OR',
      filters: [
        {key: Run.key('run', 'host'), op: '=', value: 'angry.local'},
        {
          op: 'AND',
          filters: [
            {key: Run.key('run', 'state'), op: '=', value: 'running'},
            {key: Run.key('run', 'host'), op: '=', value: 'brian.local'},
          ],
        },
      ],
    };
    const result = Filter.filterRuns(filter, runs);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({id: 'id-shawn'});
    expect(result[1]).toMatchObject({id: 'id-brian'});
  });
});