/**
 * Registry of electrical standards and their versioned directory names
 */

/**
 * Mapping of standard IDs to their versioned directory names
 */
export const standardVersions: Record<string, string> = {
  '3000': '3000-2018',
  '2293.2': '2293.2-2019',
  '3001.1': '3001.1-2022',
  '3001.2': '3001.2-2022',
  '3003': '3003-2018',
  '3004.2': '3004.2-2014',
  '3010': '3010-2017',
  '3012': '3012-2019',
  '3017': '3017-2022',
  '3019': '3019-2022',
  '3760': '3760-2022',
  '3820': '3820-2009',
  '4509.1': '4509.1-2009',
  '4509.2': '4509.2-2010',
  '4777.1': '4777.1-2016',
  '4836': '4836-2023',
  '5033': '5033-2021',
  '5139': '5139-2019'
};

/**
 * Complete information about standards including context keywords
 */
export const standardsRegistry: Record<string, {
  id: string;
  name: string;
  version: string;
  directoryName: string;
  context: string[];
}> = {
  '3000': {
    id: '3000',
    name: 'AS/NZS 3000',
    version: '2018',
    directoryName: '3000-2018',
    context: ['electrical', 'installation', 'wiring']
  },
  '2293.2': {
    id: '2293.2',
    name: 'AS/NZS 2293.2',
    version: '2019',
    directoryName: '2293.2-2019',
    context: ['emergency', 'lighting', 'exit']
  },
  '3001.1': {
    id: '3001.1',
    name: 'AS/NZS 3001.1',
    version: '2022',
    directoryName: '3001.1-2022',
    context: ['transportable', 'structures', 'vehicles']
  },
  '3001.2': {
    id: '3001.2',
    name: 'AS/NZS 3001.2',
    version: '2022',
    directoryName: '3001.2-2022',
    context: ['transportable', 'vehicles']
  },
  '3003': {
    id: '3003',
    name: 'AS/NZS 3003',
    version: '2018',
    directoryName: '3003-2018',
    context: ['patient', 'medical', 'hospital']
  },
  '3004.2': {
    id: '3004.2',
    name: 'AS/NZS 3004.2',
    version: '2014',
    directoryName: '3004.2-2014',
    context: ['marine', 'marina', 'boat']
  },
  '3010': {
    id: '3010',
    name: 'AS/NZS 3010',
    version: '2017',
    directoryName: '3010-2017',
    context: ['generator', 'generating sets']
  },
  '3012': {
    id: '3012',
    name: 'AS/NZS 3012',
    version: '2019',
    directoryName: '3012-2019',
    context: ['construction', 'demolition']
  },
  '3017': {
    id: '3017',
    name: 'AS/NZS 3017',
    version: '2022',
    directoryName: '3017-2022',
    context: ['verification', 'testing']
  },
  '3019': {
    id: '3019',
    name: 'AS/NZS 3019',
    version: '2022',
    directoryName: '3019-2022',
    context: ['periodic', 'verification']
  },
  '3760': {
    id: '3760',
    name: 'AS/NZS 3760',
    version: '2022',
    directoryName: '3760-2022',
    context: ['testing', 'inspection', 'equipment']
  },
  '3820': {
    id: '3820',
    name: 'AS/NZS 3820',
    version: '2009',
    directoryName: '3820-2009',
    context: ['safety', 'equipment']
  },
  '4509.1': {
    id: '4509.1',
    name: 'AS/NZS 4509.1',
    version: '2009',
    directoryName: '4509.1-2009',
    context: ['stand-alone', 'power']
  },
  '4509.2': {
    id: '4509.2',
    name: 'AS/NZS 4509.2',
    version: '2010',
    directoryName: '4509.2-2010',
    context: ['stand-alone', 'power']
  },
  '4777.1': {
    id: '4777.1',
    name: 'AS/NZS 4777.1',
    version: '2016',
    directoryName: '4777.1-2016',
    context: ['grid', 'inverter', 'connection']
  },
  '4836': {
    id: '4836',
    name: 'AS/NZS 4836',
    version: '2023',
    directoryName: '4836-2023',
    context: ['safety', 'working']
  },
  '5033': {
    id: '5033',
    name: 'AS/NZS 5033',
    version: '2021',
    directoryName: '5033-2021',
    context: ['solar', 'pv', 'photovoltaic']
  },
  '5139': {
    id: '5139',
    name: 'AS/NZS 5139',
    version: '2019',
    directoryName: '5139-2019',
    context: ['battery', 'energy storage']
  }
}; 