/* eslint-disable camelcase */
/* eslint-disable no-async-promise-executor */
/* eslint-disable no-inner-declarations */
const path = require('path');
const log4js = require('log4js');
const moment = require('moment');
const { v4: uuid } = require('uuid');
const _ = require('lodash');
const { writeToPath } = require('fast-csv');
const mongoose = require('mongoose');
const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');
const ALGORITHM = 'aes-256-gcm';

const config = require('../config');
const httpClient = require('../http-client');

const logger = log4js.getLogger(global.loggerName);

const dataServiceList = [
	{
		'_id': 'SRVC2006',
		'name': 'Date & Secure Test',
		'description': null,
		'app': 'Adam',
		'api': '/dateSecureTest',
		'port': 20028,
		'allowedFileTypes': [
			'ppt',
			'xls',
			'csv',
			'doc',
			'jpg',
			'png',
			'apng',
			'gif',
			'webp',
			'flif',
			'cr2',
			'orf',
			'arw',
			'dng',
			'nef',
			'rw2',
			'raf',
			'tif',
			'bmp',
			'jxr',
			'psd',
			'zip',
			'tar',
			'rar',
			'gz',
			'bz2',
			'7z',
			'dmg',
			'mp4',
			'mid',
			'mkv',
			'webm',
			'mov',
			'avi',
			'mpg',
			'mp2',
			'mp3',
			'm4a',
			'oga',
			'ogg',
			'ogv',
			'opus',
			'flac',
			'wav',
			'spx',
			'amr',
			'pdf',
			'epub',
			'exe',
			'swf',
			'rtf',
			'wasm',
			'woff',
			'woff2',
			'eot',
			'ttf',
			'otf',
			'ico',
			'flv',
			'ps',
			'xz',
			'sqlite',
			'nes',
			'crx',
			'xpi',
			'cab',
			'deb',
			'ar',
			'rpm',
			'Z',
			'lz',
			'msi',
			'mxf',
			'mts',
			'blend',
			'bpg',
			'docx',
			'pptx',
			'xlsx',
			'3gp',
			'3g2',
			'jp2',
			'jpm',
			'jpx',
			'mj2',
			'aif',
			'qcp',
			'odt',
			'ods',
			'odp',
			'xml',
			'mobi',
			'heic',
			'cur',
			'ktx',
			'ape',
			'wv',
			'wmv',
			'wma',
			'dcm',
			'ics',
			'glb',
			'pcap',
			'dsf',
			'lnk',
			'alias',
			'voc',
			'ac3',
			'm4v',
			'm4p',
			'm4b',
			'f4v',
			'f4p',
			'f4b',
			'f4a',
			'mie',
			'asf',
			'ogm',
			'ogx',
			'mpc'
		],
		'schemaFree': false,
		'simpleDate': false,
		'version': 2,
		'instances': 1,
		'versionValidity': {
			'validityValue': -1,
			'validityType': 'count',
			'_id': '657b566b189ddafb8c5c76b7'
		},
		'permanentDeleteData': true,
		'disableInsights': false,
		'status': 'Undeployed',
		'enableSearchIndex': false,
		'workflowHooks': {
			'postHooks': {
				'submit': [

				],
				'discard': [

				],
				'approve': [

				],
				'rework': [

				],
				'reject': [

				]
			}
		},
		'attributeCount': 6,
		'type': null,
		'connectors': {
			'data': {
				'_id': 'CON1000'
			},
			'file': {
				'_id': 'CON1001'
			}
		},
		'wizard': [

		],
		'webHooks': [

		],
		'preHooks': [

		],
		'_metadata': {
			'lastUpdated': '2023-12-14T19:24:30.978+0000',
			'createdAt': '2023-12-14T08:24:47.689+0000',
			'deleted': false,
			'version': {
				'document': 8,
				'_id': '657abbcfe692a1ceccf88432'
			},
			'lastUpdatedBy': 'AUTO',
			'_id': '657abbcfe692a1ceccf88431'
		},
		'collectionName': 'dateSecureTest',
		'__v': 3,
		'definition': [
			{
				'key': '_id',
				'type': 'String',
				'prefix': 'DAT',
				'suffix': null,
				'padding': null,
				'counter': 1001,
				'properties': {
					'label': null,
					'readonly': false,
					'errorMessage': null,
					'name': 'ID',
					'required': false,
					'disabled': false,
					'fieldLength': 10,
					'_description': null,
					'_typeChanged': 'id',
					'_isParrentArray': null,
					'_isGrpParentArray': null,
					'dataPath': '_id',
					'_detailedType': '',
					'dataPathSegs': [
						'_id'
					]
				},
				'_id': '657b566b189ddafb8c5c76b8'
			},
			{
				'key': 'name',
				'type': 'String',
				'properties': {
					'name': 'Name',
					'fieldLength': 10,
					'_typeChanged': 'String',
					'default': null,
					'dataPath': 'name',
					'dataPathSegs': [
						'name'
					]
				},
				'_id': '657b566b189ddafb8c5c76b9'
			},
			{
				'key': 'dateOfBirth',
				'type': 'Date',
				'properties': {
					'name': 'Date Of Birth',
					'fieldLength': 10,
					'_typeChanged': 'Date',
					'default': null,
					'dateType': 'datetime-local',
					'defaultTimezone': 'Zulu',
					'supportedTimezones': [

					],
					'dataPath': 'dateOfBirth',
					'dataPathSegs': [
						'dateOfBirth'
					]
				},
				'_id': '657b566b189ddafb8c5c76ba'
			},
			{
				'key': 'pan',
				'type': 'Object',
				'definition': [
					{
						'type': 'String',
						'key': 'value',
						'properties': {
							'name': 'value',
							'_typeChanged': 'String',
							'dataPath': 'pan.value',
							'dataPathSegs': [
								'pan',
								'value'
							]
						}
					},
					{
						'type': 'String',
						'key': 'checksum',
						'properties': {
							'name': 'checksum',
							'_typeChanged': 'String',
							'dataPath': 'pan.checksum',
							'dataPathSegs': [
								'pan',
								'checksum'
							]
						}
					}
				],
				'properties': {
					'name': 'PAN',
					'fieldLength': 10,
					'_typeChanged': 'String',
					'default': null,
					'password': true,
					'dataPath': 'pan',
					'dataPathSegs': [
						'pan'
					]
				},
				'_id': '657b566b189ddafb8c5c76bb'
			},
			{
				'key': 'contactNos',
				'type': 'Array',
				'definition': [
					{
						'type': 'String',
						'key': '_self',
						'properties': {
							'fieldLength': 10,
							'_typeChanged': 'String',
							'default': null,
							'dataPathSegs': [
								'contactNos',
								'[#]'
							],
							'dataPath': 'contactNos[#]'
						}
					}
				],
				'properties': {
					'name': 'Contact Nos',
					'fieldLength': 10,
					'_typeChanged': 'Array',
					'dataPath': 'contactNos',
					'dataPathSegs': [
						'contactNos'
					]
				},
				'_id': '657b566b189ddafb8c5c76bc'
			}
		],
		'headers': [

		],
		'relatedSchemas': {
			'incoming': [

			],
			'outgoing': [

			],
			'internal': {
				'users': [

				]
			},
			'_id': '657abc56e692a1ceccf88455'
		},
		'role': {
			'roles': [
				{
					'manageRole': true,
					'id': 'P9360893775',
					'name': 'Manage',
					'operations': [
						{
							'method': 'POST'
						},
						{
							'method': 'PUT'
						},
						{
							'method': 'DELETE'
						},
						{
							'method': 'GET'
						}
					],
					'description': 'This role entitles an authorized user to create, update or delete a record'
				},
				{
					'viewRole': true,
					'id': 'P5365826724',
					'name': 'View',
					'operations': [
						{
							'method': 'GET'
						}
					],
					'description': 'This role entitles an authorized user to view the record'
				}
			],
			'fields': {
				'_id': {
					'_t': 'String',
					'_p': {
						'P9360893775': 'R',
						'P5365826724': 'R'
					}
				},
				'name': {
					'_t': 'String',
					'_p': {
						'P9360893775': 'R',
						'P5365826724': 'R'
					}
				},
				'dateOfBirth': {
					'_t': 'Date',
					'_p': {
						'P9360893775': 'R',
						'P5365826724': 'R'
					}
				},
				'pan': {
					'_t': 'String',
					'_p': {
						'P9360893775': 'R',
						'P5365826724': 'R'
					}
				},
				'contactNos': {
					'_t': 'Array',
					'_p': {
						'P9360893775': 'R',
						'P5365826724': 'R'
					}
				}
			}
		},
		'stateModel': {
			'attribute': '',
			'initialStates': [

			],
			'enabled': false,
			'_id': '657b566b189ddafb8c5c76be'
		},
		'workflowConfig': {
			'enabled': false,
			'makerCheckers': [

			],
			'_id': '657b566b189ddafb8c5c76bf'
		},
		'comment': 'Service creation failed for service SRVC2006/Date & Secure Test',
		'draftVersion': null
	},
	{
		'_id': 'SRVC2331',
		'name': 'Executions',
		'description': null,
		'app': 'Adam',
		'api': '/executions',
		'port': 20035,
		'allowedFileTypes': [
			'ppt',
			'xls',
			'csv',
			'doc',
			'jpg',
			'png',
			'apng',
			'gif',
			'webp',
			'flif',
			'cr2',
			'orf',
			'arw',
			'dng',
			'nef',
			'rw2',
			'raf',
			'tif',
			'bmp',
			'jxr',
			'psd',
			'zip',
			'tar',
			'rar',
			'gz',
			'bz2',
			'7z',
			'dmg',
			'mp4',
			'mid',
			'mkv',
			'webm',
			'mov',
			'avi',
			'mpg',
			'mp2',
			'mp3',
			'm4a',
			'oga',
			'ogg',
			'ogv',
			'opus',
			'flac',
			'wav',
			'spx',
			'amr',
			'pdf',
			'epub',
			'exe',
			'swf',
			'rtf',
			'wasm',
			'woff',
			'woff2',
			'eot',
			'ttf',
			'otf',
			'ico',
			'flv',
			'ps',
			'xz',
			'sqlite',
			'nes',
			'crx',
			'xpi',
			'cab',
			'deb',
			'ar',
			'rpm',
			'Z',
			'lz',
			'msi',
			'mxf',
			'mts',
			'blend',
			'bpg',
			'docx',
			'pptx',
			'xlsx',
			'3gp',
			'3g2',
			'jp2',
			'jpm',
			'jpx',
			'mj2',
			'aif',
			'qcp',
			'odt',
			'ods',
			'odp',
			'xml',
			'mobi',
			'heic',
			'cur',
			'ktx',
			'ape',
			'wv',
			'wmv',
			'wma',
			'dcm',
			'ics',
			'glb',
			'pcap',
			'dsf',
			'lnk',
			'alias',
			'voc',
			'ac3',
			'm4v',
			'm4p',
			'm4b',
			'f4v',
			'f4p',
			'f4b',
			'f4a',
			'mie',
			'asf',
			'ogm',
			'ogx',
			'mpc'
		],
		'schemaFree': false,
		'simpleDate': false,
		'version': 45,
		'instances': 1,
		'versionValidity': {
			'validityValue': -1,
			'validityType': 'count',
			'_id': '65646634adb778658c92a38d'
		},
		'permanentDeleteData': true,
		'disableInsights': false,
		'definition': [
			{
				'key': '_id',
				'type': 'String',
				'prefix': 'EXE',
				'suffix': null,
				'padding': null,
				'counter': 1001,
				'properties': {
					'label': null,
					'readonly': false,
					'errorMessage': null,
					'name': 'ID',
					'required': false,
					'disabled': false,
					'fieldLength': 10,
					'_description': null,
					'_typeChanged': 'id',
					'_isParrentArray': null,
					'_isGrpParentArray': null,
					'dataPath': '_id',
					'_detailedType': '',
					'dataPathSegs': [
						'_id'
					]
				},
				'_id': '65646634adb778658c92a38e'
			},
			{
				'key': 'paymentId',
				'type': 'String',
				'properties': {
					'name': 'Payment Id',
					'fieldLength': 10,
					'_typeChanged': 'String',
					'dataPath': 'paymentId',
					'dataPathSegs': [
						'paymentId'
					]
				},
				'_id': '65646634adb778658c92a38f'
			},
			{
				'key': 'initiatingParty',
				'type': 'Object',
				'definition': [
					{
						'type': 'String',
						'key': 'name',
						'properties': {
							'name': 'Name',
							'fieldLength': 10,
							'_typeChanged': 'String',
							'dataPathSegs': [
								'initiatingParty',
								'name'
							],
							'dataPath': 'initiatingParty.name'
						}
					},
					{
						'type': 'String',
						'key': 'id',
						'properties': {
							'name': 'Id',
							'fieldLength': 10,
							'_typeChanged': 'String',
							'dataPathSegs': [
								'initiatingParty',
								'id'
							],
							'dataPath': 'initiatingParty.id'
						}
					}
				],
				'properties': {
					'name': 'Initiating Party',
					'fieldLength': 10,
					'_typeChanged': 'Object',
					'dataPath': 'initiatingParty',
					'dataPathSegs': [
						'initiatingParty'
					]
				},
				'_id': '65646634adb778658c92a390'
			},
			{
				'key': 'paymentInformation',
				'type': 'Object',
				'definition': [
					{
						'type': 'String',
						'key': 'endToEndIdentification',
						'properties': {
							'name': 'End To End Identification',
							'fieldLength': 10,
							'_typeChanged': 'String',
							'dataPathSegs': [
								'paymentInformation',
								'endToEndIdentification'
							],
							'dataPath': 'paymentInformation.endToEndIdentification'
						}
					},
					{
						'type': 'String',
						'key': 'status',
						'properties': {
							'name': 'Status',
							'fieldLength': 10,
							'_typeChanged': 'String',
							'enum': [
								'PDNG',
								'RJCT',
								'ACTC',
								'AWTD',
								'SCHD',
								'ACSP',
								'ACSC'
							],
							'dataPathSegs': [
								'paymentInformation',
								'status'
							],
							'dataPath': 'paymentInformation.status'
						}
					},
					{
						'type': 'String',
						'key': 'subStatus',
						'properties': {
							'name': 'Sub Status',
							'fieldLength': 10,
							'_typeChanged': 'String',
							'enum': [
								'BusinessValidationInProgress',
								'BusinessValidationFailed',
								'DealLienMarkingInProgress',
								'DealLienMarkCompleted',
								'PendingCustomerAuthorization',
								'ReceivedForProcessing',
								'ReceivedWithRejection',
								'DealLienReversalCompleted',
								'ScrutinyInProgress',
								'ScrutinyCompleted',
								'MarkedForScrutiny',
								'ReceivedForRejectionInScrutiny',
								'ScheduledForPayments',
								'PaymentsInProgress',
								'PaymentsCompleted',
								'PaymentPendingRetry',
								'PaymentsRejected',
								'DealClosed',
								'ReceivedForBusinessValidation',
								'DataValidationFailed',
								'RejectedBySystem',
								'RejectedByCustomer',
								'RejectedInScrutiny',
								'PaymentRejectionReceived',
								'PaymentReversalReceived',
								'LrsReversalCompleted'
							],
							'dataPathSegs': [
								'paymentInformation',
								'subStatus'
							],
							'dataPath': 'paymentInformation.subStatus'
						}
					},
					{
						'type': 'Array',
						'key': 'remarks',
						'properties': {
							'name': 'Remarks',
							'fieldLength': 10,
							'_typeChanged': 'Array',
							'dataPathSegs': [
								'paymentInformation',
								'remarks'
							],
							'dataPath': 'paymentInformation.remarks'
						},
						'definition': [
							{
								'type': 'String',
								'key': '_self',
								'properties': {
									'name': '_self',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'remarks',
										'[#]'
									],
									'dataPath': 'paymentInformation.remarks[#]'
								}
							}
						]
					},
					{
						'type': 'Object',
						'key': 'instructedAmount',
						'properties': {
							'name': 'Instructed Amount',
							'fieldLength': 10,
							'_typeChanged': 'Object',
							'dataPathSegs': [
								'paymentInformation',
								'instructedAmount'
							],
							'dataPath': 'paymentInformation.instructedAmount'
						},
						'definition': [
							{
								'type': 'Number',
								'key': 'value',
								'properties': {
									'name': 'Value',
									'fieldLength': 10,
									'_typeChanged': 'Number',
									'precision': 2,
									'dataPathSegs': [
										'paymentInformation',
										'instructedAmount',
										'value'
									],
									'dataPath': 'paymentInformation.instructedAmount.value'
								}
							},
							{
								'type': 'String',
								'key': 'currency',
								'properties': {
									'name': 'Currency',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'instructedAmount',
										'currency'
									],
									'dataPath': 'paymentInformation.instructedAmount.currency'
								}
							},
							{
								'type': 'Number',
								'key': 'inrAmount',
								'properties': {
									'name': 'Inr Amount',
									'fieldLength': 10,
									'_typeChanged': 'Number',
									'precision': 2,
									'dataPathSegs': [
										'paymentInformation',
										'instructedAmount',
										'inrAmount'
									],
									'dataPath': 'paymentInformation.instructedAmount.inrAmount'
								}
							}
						]
					},
					{
						'type': 'Object',
						'key': 'equivalentAmount',
						'properties': {
							'name': 'Equivalent Amount',
							'fieldLength': 10,
							'_typeChanged': 'Object',
							'dataPathSegs': [
								'paymentInformation',
								'equivalentAmount'
							],
							'dataPath': 'paymentInformation.equivalentAmount'
						},
						'definition': [
							{
								'type': 'Number',
								'key': 'value',
								'properties': {
									'name': 'Value',
									'fieldLength': 10,
									'_typeChanged': 'Number',
									'currency': 'INR',
									'precision': 4,
									'dataPathSegs': [
										'paymentInformation',
										'equivalentAmount',
										'value'
									],
									'dataPath': 'paymentInformation.equivalentAmount.value'
								}
							},
							{
								'type': 'String',
								'key': 'currency',
								'properties': {
									'name': 'Currency',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'equivalentAmount',
										'currency'
									],
									'dataPath': 'paymentInformation.equivalentAmount.currency'
								}
							},
							{
								'type': 'Number',
								'key': 'inrAmount',
								'properties': {
									'name': 'Inr Amount',
									'fieldLength': 10,
									'_typeChanged': 'Number',
									'precision': 2,
									'dataPathSegs': [
										'paymentInformation',
										'equivalentAmount',
										'inrAmount'
									],
									'dataPath': 'paymentInformation.equivalentAmount.inrAmount'
								}
							}
						]
					},
					{
						'type': 'Object',
						'key': 'exchangeRateInformation',
						'properties': {
							'name': 'Exchange Rate Information',
							'fieldLength': 10,
							'_typeChanged': 'Object',
							'dataPathSegs': [
								'paymentInformation',
								'exchangeRateInformation'
							],
							'dataPath': 'paymentInformation.exchangeRateInformation'
						},
						'definition': [
							{
								'type': 'Number',
								'key': 'exchangeRate',
								'properties': {
									'name': 'Exchange Rate',
									'fieldLength': 10,
									'_typeChanged': 'Number',
									'precision': 2,
									'dataPathSegs': [
										'paymentInformation',
										'exchangeRateInformation',
										'exchangeRate'
									],
									'dataPath': 'paymentInformation.exchangeRateInformation.exchangeRate'
								}
							},
							{
								'type': 'String',
								'key': 'dealReference',
								'properties': {
									'name': 'Deal Reference',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'exchangeRateInformation',
										'dealReference'
									],
									'dataPath': 'paymentInformation.exchangeRateInformation.dealReference'
								}
							}
						]
					},
					{
						'type': 'String',
						'key': 'executionDate',
						'properties': {
							'name': 'Execution Date',
							'fieldLength': 10,
							'_typeChanged': 'String',
							'dataPathSegs': [
								'paymentInformation',
								'executionDate'
							],
							'dataPath': 'paymentInformation.executionDate'
						}
					},
					{
						'type': 'String',
						'key': 'method',
						'properties': {
							'name': 'Method',
							'fieldLength': 10,
							'_typeChanged': 'String',
							'dataPathSegs': [
								'paymentInformation',
								'method'
							],
							'dataPath': 'paymentInformation.method'
						}
					},
					{
						'type': 'Object',
						'key': 'debtor',
						'properties': {
							'name': 'Debtor',
							'fieldLength': 10,
							'_typeChanged': 'Object',
							'dataPathSegs': [
								'paymentInformation',
								'debtor'
							],
							'dataPath': 'paymentInformation.debtor'
						},
						'definition': [
							{
								'type': 'String',
								'key': 'name',
								'properties': {
									'name': 'Name',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'debtor',
										'name'
									],
									'dataPath': 'paymentInformation.debtor.name'
								}
							},
							{
								'type': 'String',
								'key': 'id',
								'properties': {
									'name': 'Id',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'debtor',
										'id'
									],
									'dataPath': 'paymentInformation.debtor.id'
								}
							},
							{
								'type': 'String',
								'key': 'customerId',
								'properties': {
									'name': 'Customer Id',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'debtor',
										'customerId'
									],
									'dataPath': 'paymentInformation.debtor.customerId'
								}
							},
							{
								'type': 'Object',
								'key': 'account',
								'properties': {
									'name': 'Account',
									'fieldLength': 10,
									'_typeChanged': 'Object',
									'dataPathSegs': [
										'paymentInformation',
										'debtor',
										'account'
									],
									'dataPath': 'paymentInformation.debtor.account'
								},
								'definition': [
									{
										'type': 'String',
										'key': 'id',
										'properties': {
											'name': 'Id',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'dataPathSegs': [
												'paymentInformation',
												'debtor',
												'account',
												'id'
											],
											'dataPath': 'paymentInformation.debtor.account.id'
										}
									},
									{
										'type': 'String',
										'key': 'bic',
										'properties': {
											'name': 'BIC',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'dataPathSegs': [
												'paymentInformation',
												'debtor',
												'account',
												'bic'
											],
											'dataPath': 'paymentInformation.debtor.account.bic'
										}
									}
								]
							}
						]
					},
					{
						'type': 'Object',
						'key': 'remittanceInfo',
						'properties': {
							'name': 'Remittance Info',
							'fieldLength': 10,
							'_typeChanged': 'Object',
							'dataPathSegs': [
								'paymentInformation',
								'remittanceInfo'
							],
							'dataPath': 'paymentInformation.remittanceInfo'
						},
						'definition': [
							{
								'type': 'String',
								'key': 'purpose',
								'properties': {
									'name': 'Purpose',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'remittanceInfo',
										'purpose'
									],
									'dataPath': 'paymentInformation.remittanceInfo.purpose'
								}
							},
							{
								'type': 'String',
								'key': 'additionalInfo',
								'properties': {
									'name': 'Additional Info',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'remittanceInfo',
										'additionalInfo'
									],
									'dataPath': 'paymentInformation.remittanceInfo.additionalInfo'
								}
							},
							{
								'type': 'String',
								'key': 'taxReportInfo',
								'properties': {
									'name': 'Tax Report Info',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'remittanceInfo',
										'taxReportInfo'
									],
									'dataPath': 'paymentInformation.remittanceInfo.taxReportInfo'
								}
							},
							{
								'type': 'String',
								'key': 'purposeCode',
								'properties': {
									'name': 'Purpose Code',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'remittanceInfo',
										'purposeCode'
									],
									'dataPath': 'paymentInformation.remittanceInfo.purposeCode'
								}
							},
							{
								'type': 'String',
								'key': 'purposeDescription',
								'properties': {
									'name': 'Purpose Description',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'remittanceInfo',
										'purposeDescription'
									],
									'dataPath': 'paymentInformation.remittanceInfo.purposeDescription'
								}
							}
						]
					},
					{
						'type': 'Array',
						'key': 'charges',
						'properties': {
							'name': 'Charges',
							'fieldLength': 10,
							'_typeChanged': 'Array',
							'dataPathSegs': [
								'paymentInformation',
								'charges'
							],
							'dataPath': 'paymentInformation.charges'
						},
						'definition': [
							{
								'type': 'Object',
								'key': '_self',
								'properties': {
									'name': '_self',
									'fieldLength': 10,
									'_typeChanged': 'Object',
									'dataPathSegs': [
										'paymentInformation',
										'charges',
										'[#]'
									],
									'dataPath': 'paymentInformation.charges[#]'
								},
								'definition': [
									{
										'type': 'String',
										'key': 'type',
										'properties': {
											'name': 'Type',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'enum': [
												'Total Charges',
												'GST On Charges',
												'SWIFT Charges',
												'Correspondent Bank Charges',
												'Commission Charges',
												'GST On Commission',
												'SWIFT'
											],
											'dataPathSegs': [
												'paymentInformation',
												'charges',
												'[#]',
												'type'
											],
											'dataPath': 'paymentInformation.charges[#].type'
										}
									},
									{
										'type': 'String',
										'key': 'chargeMnemonic',
										'properties': {
											'name': 'Charge Mnemonic',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'enum': [
												'BEN',
												'SHA',
												'OUR',
												'CORRBANKCHARGES',
												'COMMISSIONCHARGES'
											],
											'dataPathSegs': [
												'paymentInformation',
												'charges',
												'[#]',
												'chargeMnemonic'
											],
											'dataPath': 'paymentInformation.charges[#].chargeMnemonic'
										}
									},
									{
										'type': 'Number',
										'key': 'value',
										'properties': {
											'name': 'Value',
											'fieldLength': 10,
											'_typeChanged': 'Number',
											'currency': 'INR',
											'precision': 2,
											'dataPathSegs': [
												'paymentInformation',
												'charges',
												'[#]',
												'value'
											],
											'dataPath': 'paymentInformation.charges[#].value'
										}
									},
									{
										'type': 'String',
										'key': 'currency',
										'properties': {
											'name': 'Currency',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'dataPathSegs': [
												'paymentInformation',
												'charges',
												'[#]',
												'currency'
											],
											'dataPath': 'paymentInformation.charges[#].currency'
										}
									},
									{
										'type': 'String',
										'key': 'ruleId',
										'properties': {
											'name': 'RuleID',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'dataPathSegs': [
												'paymentInformation',
												'charges',
												'[#]',
												'ruleId'
											],
											'dataPath': 'paymentInformation.charges[#].ruleId'
										}
									},
									{
										'type': 'Number',
										'key': 'flatFee',
										'properties': {
											'name': 'Flat Fee',
											'fieldLength': 10,
											'_typeChanged': 'Number',
											'currency': 'INR',
											'precision': 4,
											'dataPathSegs': [
												'paymentInformation',
												'charges',
												'[#]',
												'flatFee'
											],
											'dataPath': 'paymentInformation.charges[#].flatFee'
										}
									},
									{
										'type': 'Number',
										'key': 'percentage',
										'properties': {
											'name': 'Percentage',
											'fieldLength': 10,
											'_typeChanged': 'Number',
											'precision': 4,
											'dataPathSegs': [
												'paymentInformation',
												'charges',
												'[#]',
												'percentage'
											],
											'dataPath': 'paymentInformation.charges[#].percentage'
										}
									}
								]
							}
						]
					},
					{
						'type': 'Object',
						'key': 'details',
						'properties': {
							'name': 'Details',
							'fieldLength': 10,
							'_typeChanged': 'Object',
							'dataPathSegs': [
								'paymentInformation',
								'details'
							],
							'dataPath': 'paymentInformation.details'
						},
						'definition': [
							{
								'type': 'String',
								'key': 'reference',
								'properties': {
									'name': 'Reference',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'details',
										'reference'
									],
									'dataPath': 'paymentInformation.details.reference'
								}
							},
							{
								'type': 'String',
								'key': 'relatedInfo',
								'properties': {
									'name': 'Related Info',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'details',
										'relatedInfo'
									],
									'dataPath': 'paymentInformation.details.relatedInfo'
								}
							},
							{
								'type': 'Object',
								'key': 'ultimateDebtor',
								'properties': {
									'name': 'Ultimate Debtor',
									'fieldLength': 10,
									'_typeChanged': 'Object',
									'dataPathSegs': [
										'paymentInformation',
										'details',
										'ultimateDebtor'
									],
									'dataPath': 'paymentInformation.details.ultimateDebtor'
								},
								'definition': [
									{
										'type': 'String',
										'key': 'name',
										'properties': {
											'name': 'Name',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'dataPathSegs': [
												'paymentInformation',
												'details',
												'ultimateDebtor',
												'name'
											],
											'dataPath': 'paymentInformation.details.ultimateDebtor.name'
										}
									},
									{
										'type': 'String',
										'key': 'id',
										'properties': {
											'name': 'Id',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'dataPathSegs': [
												'paymentInformation',
												'details',
												'ultimateDebtor',
												'id'
											],
											'dataPath': 'paymentInformation.details.ultimateDebtor.id'
										}
									},
									{
										'type': 'Object',
										'key': 'address',
										'properties': {
											'name': 'Address',
											'fieldLength': 10,
											'_typeChanged': 'Object',
											'dataPathSegs': [
												'paymentInformation',
												'details',
												'ultimateDebtor',
												'address'
											],
											'dataPath': 'paymentInformation.details.ultimateDebtor.address'
										},
										'definition': [
											{
												'type': 'String',
												'key': 'line',
												'properties': {
													'name': 'Line',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'details',
														'ultimateDebtor',
														'address',
														'line'
													],
													'dataPath': 'paymentInformation.details.ultimateDebtor.address.line'
												}
											},
											{
												'type': 'String',
												'key': 'postalCode',
												'properties': {
													'name': 'Postal Code',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'details',
														'ultimateDebtor',
														'address',
														'postalCode'
													],
													'dataPath': 'paymentInformation.details.ultimateDebtor.address.postalCode'
												}
											},
											{
												'type': 'String',
												'key': 'town',
												'properties': {
													'name': 'Town',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'details',
														'ultimateDebtor',
														'address',
														'town'
													],
													'dataPath': 'paymentInformation.details.ultimateDebtor.address.town'
												}
											},
											{
												'type': 'String',
												'key': 'country',
												'properties': {
													'name': 'Country',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'details',
														'ultimateDebtor',
														'address',
														'country'
													],
													'dataPath': 'paymentInformation.details.ultimateDebtor.address.country'
												}
											}
										]
									},
									{
										'type': 'Object',
										'definition': [
											{
												'type': 'String',
												'key': 'value',
												'properties': {
													'name': 'value',
													'_typeChanged': 'String'
												}
											},
											{
												'type': 'String',
												'key': 'checksum',
												'properties': {
													'name': 'checksum',
													'_typeChanged': 'String'
												}
											}
										],
										'key': 'pan',
										'properties': {
											'name': 'Pan',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'password': true,
											'dataPathSegs': [
												'paymentInformation',
												'details',
												'ultimateDebtor',
												'pan'
											],
											'dataPath': 'paymentInformation.details.ultimateDebtor.pan'
										}
									},
									{
										'type': 'String',
										'key': 'type',
										'properties': {
											'name': 'Type',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'dataPathSegs': [
												'paymentInformation',
												'details',
												'ultimateDebtor',
												'type'
											],
											'dataPath': 'paymentInformation.details.ultimateDebtor.type'
										}
									},
									{
										'type': 'String',
										'key': 'fuzzyMatch',
										'properties': {
											'name': 'Fuzzy Match',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'dataPathSegs': [
												'paymentInformation',
												'details',
												'ultimateDebtor',
												'fuzzyMatch'
											],
											'dataPath': 'paymentInformation.details.ultimateDebtor.fuzzyMatch'
										}
									},
									{
										'type': 'String',
										'key': 'nsdlName',
										'properties': {
											'name': 'Nsdl Name',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'dataPathSegs': [
												'paymentInformation',
												'details',
												'ultimateDebtor',
												'nsdlName'
											],
											'dataPath': 'paymentInformation.details.ultimateDebtor.nsdlName'
										}
									},
									{
										'type': 'String',
										'key': 'crmMatch',
										'properties': {
											'name': 'CRM Match',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'enum': [
												'FoundAndSame',
												'FoundAndDifferent',
												'NotFound'
											],
											'dataPathSegs': [
												'paymentInformation',
												'details',
												'ultimateDebtor',
												'crmMatch'
											],
											'dataPath': 'paymentInformation.details.ultimateDebtor.crmMatch'
										}
									},
									{
										'type': 'String',
										'key': 'crmName',
										'properties': {
											'name': 'CRM Name',
											'fieldLength': 10,
											'_description': 'Name found in the core systems(FCR for eg)  if customer is existing',
											'_typeChanged': 'String',
											'dataPathSegs': [
												'paymentInformation',
												'details',
												'ultimateDebtor',
												'crmName'
											],
											'dataPath': 'paymentInformation.details.ultimateDebtor.crmName'
										}
									},
									{
										'type': 'String',
										'key': 'crmCustomerType',
										'properties': {
											'name': 'CRM Customer Type',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'dataPathSegs': [
												'paymentInformation',
												'details',
												'ultimateDebtor',
												'crmCustomerType'
											],
											'dataPath': 'paymentInformation.details.ultimateDebtor.crmCustomerType'
										}
									}
								]
							},
							{
								'type': 'Object',
								'key': 'ultimateCreditor',
								'properties': {
									'name': 'Ultimate Creditor',
									'fieldLength': 10,
									'_typeChanged': 'Object',
									'dataPathSegs': [
										'paymentInformation',
										'details',
										'ultimateCreditor'
									],
									'dataPath': 'paymentInformation.details.ultimateCreditor'
								},
								'definition': [
									{
										'type': 'String',
										'key': 'name',
										'properties': {
											'name': 'Name',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'dataPathSegs': [
												'paymentInformation',
												'details',
												'ultimateCreditor',
												'name'
											],
											'dataPath': 'paymentInformation.details.ultimateCreditor.name'
										}
									},
									{
										'type': 'String',
										'key': 'id',
										'properties': {
											'name': 'Id',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'dataPathSegs': [
												'paymentInformation',
												'details',
												'ultimateCreditor',
												'id'
											],
											'dataPath': 'paymentInformation.details.ultimateCreditor.id'
										}
									},
									{
										'type': 'Object',
										'key': 'address',
										'properties': {
											'name': 'Address',
											'fieldLength': 10,
											'_typeChanged': 'Object',
											'dataPathSegs': [
												'paymentInformation',
												'details',
												'ultimateCreditor',
												'address'
											],
											'dataPath': 'paymentInformation.details.ultimateCreditor.address'
										},
										'definition': [
											{
												'type': 'String',
												'key': 'line',
												'properties': {
													'name': 'Line',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'details',
														'ultimateCreditor',
														'address',
														'line'
													],
													'dataPath': 'paymentInformation.details.ultimateCreditor.address.line'
												}
											},
											{
												'type': 'String',
												'key': 'postalCode',
												'properties': {
													'name': 'Postal Code',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'details',
														'ultimateCreditor',
														'address',
														'postalCode'
													],
													'dataPath': 'paymentInformation.details.ultimateCreditor.address.postalCode'
												}
											},
											{
												'type': 'String',
												'key': 'town',
												'properties': {
													'name': 'Town',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'details',
														'ultimateCreditor',
														'address',
														'town'
													],
													'dataPath': 'paymentInformation.details.ultimateCreditor.address.town'
												}
											},
											{
												'type': 'String',
												'key': 'country',
												'properties': {
													'name': 'Country',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'details',
														'ultimateCreditor',
														'address',
														'country'
													],
													'dataPath': 'paymentInformation.details.ultimateCreditor.address.country'
												}
											}
										]
									}
								]
							}
						]
					},
					{
						'type': 'Object',
						'key': 'instructions',
						'properties': {
							'name': 'Instructions',
							'fieldLength': 10,
							'_typeChanged': 'Object',
							'dataPathSegs': [
								'paymentInformation',
								'instructions'
							],
							'dataPath': 'paymentInformation.instructions'
						},
						'definition': [
							{
								'type': 'Array',
								'key': 'correspondentBankDetails',
								'properties': {
									'name': 'Correspondent Bank Details',
									'fieldLength': 10,
									'_typeChanged': 'Array',
									'dataPathSegs': [
										'paymentInformation',
										'instructions',
										'correspondentBankDetails'
									],
									'dataPath': 'paymentInformation.instructions.correspondentBankDetails'
								},
								'definition': [
									{
										'type': 'Object',
										'key': '_self',
										'properties': {
											'name': '_self',
											'fieldLength': 10,
											'_typeChanged': 'Object',
											'dataPathSegs': [
												'paymentInformation',
												'instructions',
												'correspondentBankDetails',
												'[#]'
											],
											'dataPath': 'paymentInformation.instructions.correspondentBankDetails[#]'
										},
										'definition': [
											{
												'type': 'String',
												'key': 'name',
												'properties': {
													'name': 'Name',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'instructions',
														'correspondentBankDetails',
														'[#]',
														'name'
													],
													'dataPath': 'paymentInformation.instructions.correspondentBankDetails[#].name'
												}
											},
											{
												'type': 'Object',
												'key': 'address',
												'properties': {
													'name': 'Address',
													'fieldLength': 10,
													'_typeChanged': 'Object',
													'dataPathSegs': [
														'paymentInformation',
														'instructions',
														'correspondentBankDetails',
														'[#]',
														'address'
													],
													'dataPath': 'paymentInformation.instructions.correspondentBankDetails[#].address'
												},
												'definition': [
													{
														'type': 'String',
														'key': 'line',
														'properties': {
															'name': 'Line',
															'fieldLength': 10,
															'_typeChanged': 'String',
															'dataPathSegs': [
																'paymentInformation',
																'instructions',
																'correspondentBankDetails',
																'[#]',
																'address',
																'line'
															],
															'dataPath': 'paymentInformation.instructions.correspondentBankDetails[#].address.line'
														}
													},
													{
														'type': 'String',
														'key': 'postalCode',
														'properties': {
															'name': 'Postal Code',
															'fieldLength': 10,
															'_typeChanged': 'String',
															'dataPathSegs': [
																'paymentInformation',
																'instructions',
																'correspondentBankDetails',
																'[#]',
																'address',
																'postalCode'
															],
															'dataPath': 'paymentInformation.instructions.correspondentBankDetails[#].address.postalCode'
														}
													},
													{
														'type': 'String',
														'key': 'town',
														'properties': {
															'name': 'Town',
															'fieldLength': 10,
															'_typeChanged': 'String',
															'dataPathSegs': [
																'paymentInformation',
																'instructions',
																'correspondentBankDetails',
																'[#]',
																'address',
																'town'
															],
															'dataPath': 'paymentInformation.instructions.correspondentBankDetails[#].address.town'
														}
													},
													{
														'type': 'String',
														'key': 'country',
														'properties': {
															'name': 'Country',
															'fieldLength': 10,
															'_typeChanged': 'String',
															'dataPathSegs': [
																'paymentInformation',
																'instructions',
																'correspondentBankDetails',
																'[#]',
																'address',
																'country'
															],
															'dataPath': 'paymentInformation.instructions.correspondentBankDetails[#].address.country'
														}
													}
												]
											},
											{
												'type': 'String',
												'key': 'swift',
												'properties': {
													'name': 'Swift',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'instructions',
														'correspondentBankDetails',
														'[#]',
														'swift'
													],
													'dataPath': 'paymentInformation.instructions.correspondentBankDetails[#].swift'
												}
											},
											{
												'type': 'String',
												'key': 'sortCode',
												'properties': {
													'name': 'Sort Code',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'instructions',
														'correspondentBankDetails',
														'[#]',
														'sortCode'
													],
													'dataPath': 'paymentInformation.instructions.correspondentBankDetails[#].sortCode'
												}
											},
											{
												'type': 'String',
												'key': 'account',
												'properties': {
													'name': 'Account',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'instructions',
														'correspondentBankDetails',
														'[#]',
														'account'
													],
													'dataPath': 'paymentInformation.instructions.correspondentBankDetails[#].account'
												}
											}
										]
									}
								]
							},
							{
								'type': 'Object',
								'key': 'beneficiaryBank',
								'properties': {
									'name': 'Beneficiary Bank',
									'fieldLength': 10,
									'_typeChanged': 'Object',
									'dataPathSegs': [
										'paymentInformation',
										'instructions',
										'beneficiaryBank'
									],
									'dataPath': 'paymentInformation.instructions.beneficiaryBank'
								},
								'definition': [
									{
										'type': 'String',
										'key': 'name',
										'properties': {
											'name': 'Name',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'dataPathSegs': [
												'paymentInformation',
												'instructions',
												'beneficiaryBank',
												'name'
											],
											'dataPath': 'paymentInformation.instructions.beneficiaryBank.name'
										}
									},
									{
										'type': 'Object',
										'key': 'address',
										'properties': {
											'name': 'Address',
											'fieldLength': 10,
											'_typeChanged': 'Object',
											'dataPathSegs': [
												'paymentInformation',
												'instructions',
												'beneficiaryBank',
												'address'
											],
											'dataPath': 'paymentInformation.instructions.beneficiaryBank.address'
										},
										'definition': [
											{
												'type': 'String',
												'key': 'line',
												'properties': {
													'name': 'Line',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'instructions',
														'beneficiaryBank',
														'address',
														'line'
													],
													'dataPath': 'paymentInformation.instructions.beneficiaryBank.address.line'
												}
											},
											{
												'type': 'String',
												'key': 'postalCode',
												'properties': {
													'name': 'Postal Code',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'instructions',
														'beneficiaryBank',
														'address',
														'postalCode'
													],
													'dataPath': 'paymentInformation.instructions.beneficiaryBank.address.postalCode'
												}
											},
											{
												'type': 'String',
												'key': 'town',
												'properties': {
													'name': 'Town',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'instructions',
														'beneficiaryBank',
														'address',
														'town'
													],
													'dataPath': 'paymentInformation.instructions.beneficiaryBank.address.town'
												}
											},
											{
												'type': 'String',
												'key': 'country',
												'properties': {
													'name': 'Country',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'instructions',
														'beneficiaryBank',
														'address',
														'country'
													],
													'dataPath': 'paymentInformation.instructions.beneficiaryBank.address.country'
												}
											}
										]
									},
									{
										'type': 'String',
										'key': 'swift',
										'properties': {
											'name': 'Swift',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'dataPathSegs': [
												'paymentInformation',
												'instructions',
												'beneficiaryBank',
												'swift'
											],
											'dataPath': 'paymentInformation.instructions.beneficiaryBank.swift'
										}
									},
									{
										'type': 'String',
										'key': 'sortCode',
										'properties': {
											'name': 'Sort Code',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'dataPathSegs': [
												'paymentInformation',
												'instructions',
												'beneficiaryBank',
												'sortCode'
											],
											'dataPath': 'paymentInformation.instructions.beneficiaryBank.sortCode'
										}
									},
									{
										'type': 'String',
										'key': 'account',
										'properties': {
											'name': 'Account',
											'fieldLength': 10,
											'_typeChanged': 'String',
											'dataPathSegs': [
												'paymentInformation',
												'instructions',
												'beneficiaryBank',
												'account'
											],
											'dataPath': 'paymentInformation.instructions.beneficiaryBank.account'
										}
									}
								]
							},
							{
								'type': 'String',
								'key': 'type',
								'properties': {
									'name': 'Type',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'instructions',
										'type'
									],
									'dataPath': 'paymentInformation.instructions.type'
								}
							},
							{
								'type': 'Boolean',
								'key': 'batch',
								'properties': {
									'name': 'Batch',
									'fieldLength': 10,
									'_typeChanged': 'Boolean',
									'dataPathSegs': [
										'paymentInformation',
										'instructions',
										'batch'
									],
									'dataPath': 'paymentInformation.instructions.batch'
								}
							},
							{
								'type': 'String',
								'key': 'fileId',
								'properties': {
									'name': 'File Id',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'instructions',
										'fileId'
									],
									'dataPath': 'paymentInformation.instructions.fileId'
								}
							},
							{
								'type': 'String',
								'key': 'clearingSystemRef',
								'properties': {
									'name': 'Clearing System Ref',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'instructions',
										'clearingSystemRef'
									],
									'dataPath': 'paymentInformation.instructions.clearingSystemRef'
								}
							},
							{
								'type': 'String',
								'key': 'coreBankingSystemRef',
								'properties': {
									'name': 'Core Banking System Ref',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'instructions',
										'coreBankingSystemRef'
									],
									'dataPath': 'paymentInformation.instructions.coreBankingSystemRef'
								}
							},
							{
								'type': 'String',
								'key': 'lrsRef',
								'properties': {
									'name': 'Lrs Ref',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'instructions',
										'lrsRef'
									],
									'dataPath': 'paymentInformation.instructions.lrsRef'
								}
							},
							{
								'type': 'Boolean',
								'key': 'lrsFlag',
								'properties': {
									'name': 'Lrs Flag',
									'fieldLength': 10,
									'_typeChanged': 'Boolean',
									'dataPathSegs': [
										'paymentInformation',
										'instructions',
										'lrsFlag'
									],
									'dataPath': 'paymentInformation.instructions.lrsFlag'
								}
							},
							{
								'type': 'String',
								'key': 'channel',
								'properties': {
									'name': 'Channel',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'instructions',
										'channel'
									],
									'dataPath': 'paymentInformation.instructions.channel'
								}
							},
							{
								'type': 'String',
								'key': 'debitAdviceType',
								'properties': {
									'name': 'Debit Advice Type',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'instructions',
										'debitAdviceType'
									],
									'dataPath': 'paymentInformation.instructions.debitAdviceType'
								}
							}
						]
					},
					{
						'type': 'Object',
						'key': 'supplementaryData',
						'properties': {
							'name': 'Supplementary Data',
							'fieldLength': 10,
							'_typeChanged': 'Object',
							'dataPathSegs': [
								'paymentInformation',
								'supplementaryData'
							],
							'dataPath': 'paymentInformation.supplementaryData'
						},
						'definition': [
							{
								'type': 'String',
								'key': 'additional',
								'properties': {
									'name': 'Additional',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'supplementaryData',
										'additional'
									],
									'dataPath': 'paymentInformation.supplementaryData.additional'
								}
							},
							{
								'type': 'String',
								'key': 'workflowReference',
								'properties': {
									'name': 'WorkflowReference',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'supplementaryData',
										'workflowReference'
									],
									'dataPath': 'paymentInformation.supplementaryData.workflowReference'
								}
							},
							{
								'type': 'Boolean',
								'key': 'nameScreeningMatch',
								'properties': {
									'name': 'NameScreeningMatch',
									'fieldLength': 10,
									'_description': 'Name screening  true or false',
									'_typeChanged': 'Boolean',
									'dataPathSegs': [
										'paymentInformation',
										'supplementaryData',
										'nameScreeningMatch'
									],
									'dataPath': 'paymentInformation.supplementaryData.nameScreeningMatch'
								}
							},
							{
								'type': 'Object',
								'key': 'nameScreenChecks',
								'properties': {
									'name': 'Name Screen Checks',
									'fieldLength': 10,
									'_typeChanged': 'Object',
									'dataPathSegs': [
										'paymentInformation',
										'supplementaryData',
										'nameScreenChecks'
									],
									'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks'
								},
								'definition': [
									{
										'type': 'Object',
										'key': 'ultimateDebtor',
										'properties': {
											'name': 'Ultimate Debtor',
											'fieldLength': 10,
											'_typeChanged': 'Object',
											'dataPathSegs': [
												'paymentInformation',
												'supplementaryData',
												'nameScreenChecks',
												'ultimateDebtor'
											],
											'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.ultimateDebtor'
										},
										'definition': [
											{
												'type': 'String',
												'key': 'name',
												'properties': {
													'name': 'Name',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'supplementaryData',
														'nameScreenChecks',
														'ultimateDebtor',
														'name'
													],
													'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.ultimateDebtor.name'
												}
											},
											{
												'type': 'Boolean',
												'key': 'matchFound',
												'properties': {
													'name': 'Match Found',
													'fieldLength': 10,
													'_typeChanged': 'Boolean',
													'dataPathSegs': [
														'paymentInformation',
														'supplementaryData',
														'nameScreenChecks',
														'ultimateDebtor',
														'matchFound'
													],
													'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.ultimateDebtor.matchFound'
												}
											},
											{
												'type': 'String',
												'key': 'reference',
												'properties': {
													'name': 'Reference',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'supplementaryData',
														'nameScreenChecks',
														'ultimateDebtor',
														'reference'
													],
													'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.ultimateDebtor.reference'
												}
											}
										]
									},
									{
										'type': 'Object',
										'key': 'ultimateCreditor',
										'properties': {
											'name': 'Ultimate Creditor',
											'fieldLength': 10,
											'_typeChanged': 'Object',
											'dataPathSegs': [
												'paymentInformation',
												'supplementaryData',
												'nameScreenChecks',
												'ultimateCreditor'
											],
											'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.ultimateCreditor'
										},
										'definition': [
											{
												'type': 'String',
												'key': 'name',
												'properties': {
													'name': 'Name',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'supplementaryData',
														'nameScreenChecks',
														'ultimateCreditor',
														'name'
													],
													'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.ultimateCreditor.name'
												}
											},
											{
												'type': 'Boolean',
												'key': 'matchFound',
												'properties': {
													'name': 'Match Found',
													'fieldLength': 10,
													'_typeChanged': 'Boolean',
													'dataPathSegs': [
														'paymentInformation',
														'supplementaryData',
														'nameScreenChecks',
														'ultimateCreditor',
														'matchFound'
													],
													'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.ultimateCreditor.matchFound'
												}
											},
											{
												'type': 'String',
												'key': 'reference',
												'properties': {
													'name': 'Reference',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'supplementaryData',
														'nameScreenChecks',
														'ultimateCreditor',
														'reference'
													],
													'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.ultimateCreditor.reference'
												}
											}
										]
									},
									{
										'type': 'Object',
										'key': 'correspondentBankDetails',
										'properties': {
											'name': 'Correspondent Bank Details',
											'fieldLength': 10,
											'_typeChanged': 'Object',
											'dataPathSegs': [
												'paymentInformation',
												'supplementaryData',
												'nameScreenChecks',
												'correspondentBankDetails'
											],
											'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.correspondentBankDetails'
										},
										'definition': [
											{
												'type': 'String',
												'key': 'name',
												'properties': {
													'name': 'Name',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'supplementaryData',
														'nameScreenChecks',
														'correspondentBankDetails',
														'name'
													],
													'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.correspondentBankDetails.name'
												}
											},
											{
												'type': 'Boolean',
												'key': 'matchFound',
												'properties': {
													'name': 'Match Found',
													'fieldLength': 10,
													'_typeChanged': 'Boolean',
													'dataPathSegs': [
														'paymentInformation',
														'supplementaryData',
														'nameScreenChecks',
														'correspondentBankDetails',
														'matchFound'
													],
													'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.correspondentBankDetails.matchFound'
												}
											},
											{
												'type': 'String',
												'key': 'reference',
												'properties': {
													'name': 'Reference',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'supplementaryData',
														'nameScreenChecks',
														'correspondentBankDetails',
														'reference'
													],
													'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.correspondentBankDetails.reference'
												}
											}
										]
									},
									{
										'type': 'Object',
										'key': 'ultimateCreditorCountry',
										'properties': {
											'name': 'Ultimate Creditor Country',
											'fieldLength': 10,
											'_typeChanged': 'Object',
											'dataPathSegs': [
												'paymentInformation',
												'supplementaryData',
												'nameScreenChecks',
												'ultimateCreditorCountry'
											],
											'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.ultimateCreditorCountry'
										},
										'definition': [
											{
												'type': 'String',
												'key': 'name',
												'properties': {
													'name': 'Name',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'supplementaryData',
														'nameScreenChecks',
														'ultimateCreditorCountry',
														'name'
													],
													'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.ultimateCreditorCountry.name'
												}
											},
											{
												'type': 'Boolean',
												'key': 'matchFound',
												'properties': {
													'name': 'Match Found',
													'fieldLength': 10,
													'_typeChanged': 'Boolean',
													'dataPathSegs': [
														'paymentInformation',
														'supplementaryData',
														'nameScreenChecks',
														'ultimateCreditorCountry',
														'matchFound'
													],
													'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.ultimateCreditorCountry.matchFound'
												}
											},
											{
												'type': 'String',
												'key': 'reference',
												'properties': {
													'name': 'Reference',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'supplementaryData',
														'nameScreenChecks',
														'ultimateCreditorCountry',
														'reference'
													],
													'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.ultimateCreditorCountry.reference'
												}
											}
										]
									},
									{
										'type': 'Object',
										'key': 'beneficiaryBank',
										'properties': {
											'name': 'Beneficiary Bank',
											'fieldLength': 10,
											'_typeChanged': 'Object',
											'dataPathSegs': [
												'paymentInformation',
												'supplementaryData',
												'nameScreenChecks',
												'beneficiaryBank'
											],
											'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.beneficiaryBank'
										},
										'definition': [
											{
												'type': 'String',
												'key': 'name',
												'properties': {
													'name': 'Name',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'supplementaryData',
														'nameScreenChecks',
														'beneficiaryBank',
														'name'
													],
													'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.beneficiaryBank.name'
												}
											},
											{
												'type': 'Boolean',
												'key': 'matchFound',
												'properties': {
													'name': 'Match Found',
													'fieldLength': 10,
													'_typeChanged': 'Boolean',
													'dataPathSegs': [
														'paymentInformation',
														'supplementaryData',
														'nameScreenChecks',
														'beneficiaryBank',
														'matchFound'
													],
													'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.beneficiaryBank.matchFound'
												}
											},
											{
												'type': 'String',
												'key': 'reference',
												'properties': {
													'name': 'Reference',
													'fieldLength': 10,
													'_typeChanged': 'String',
													'dataPathSegs': [
														'paymentInformation',
														'supplementaryData',
														'nameScreenChecks',
														'beneficiaryBank',
														'reference'
													],
													'dataPath': 'paymentInformation.supplementaryData.nameScreenChecks.beneficiaryBank.reference'
												}
											}
										]
									}
								]
							}
						]
					},
					{
						'type': 'Object',
						'key': 'trailer',
						'properties': {
							'name': 'Trailer',
							'fieldLength': 10,
							'_typeChanged': 'Object',
							'dataPathSegs': [
								'paymentInformation',
								'trailer'
							],
							'dataPath': 'paymentInformation.trailer'
						},
						'definition': [
							{
								'type': 'String',
								'key': 'mac',
								'properties': {
									'name': 'Mac',
									'fieldLength': 10,
									'_typeChanged': 'String',
									'dataPathSegs': [
										'paymentInformation',
										'trailer',
										'mac'
									],
									'dataPath': 'paymentInformation.trailer.mac'
								}
							}
						]
					},
					{
						'type': 'String',
						'key': 'contractReference',
						'properties': {
							'name': 'Contract Reference',
							'fieldLength': 10,
							'_typeChanged': 'String',
							'dataPathSegs': [
								'paymentInformation',
								'contractReference'
							],
							'dataPath': 'paymentInformation.contractReference'
						}
					},
					{
						'type': 'Object',
						'key': 'flags',
						'properties': {
							'name': 'Flags',
							'fieldLength': 10,
							'_typeChanged': 'Object',
							'dataPathSegs': [
								'paymentInformation',
								'flags'
							],
							'dataPath': 'paymentInformation.flags'
						},
						'definition': [
							{
								'type': 'Boolean',
								'key': 'batchBooking',
								'properties': {
									'name': 'Batch Booking',
									'fieldLength': 10,
									'_typeChanged': 'Boolean',
									'dataPathSegs': [
										'paymentInformation',
										'flags',
										'batchBooking'
									],
									'dataPath': 'paymentInformation.flags.batchBooking'
								}
							}
						]
					}
				],
				'properties': {
					'name': 'Payment Information',
					'fieldLength': 10,
					'_typeChanged': 'Object',
					'dataPath': 'paymentInformation',
					'dataPathSegs': [
						'paymentInformation'
					]
				},
				'_id': '65646634adb778658c92a391'
			},
			{
				'key': 'groupKey',
				'type': 'String',
				'properties': {
					'name': 'Group Key',
					'fieldLength': 10,
					'_typeChanged': 'String',
					'dataPath': 'groupKey',
					'dataPathSegs': [
						'groupKey'
					]
				},
				'_id': '65646634adb778658c92a392'
			},
			{
				'key': 'scheduledDateTime',
				'type': 'String',
				'properties': {
					'name': 'Scheduled Date Time',
					'fieldLength': 10,
					'_typeChanged': 'String',
					'dataPath': 'scheduledDateTime',
					'dataPathSegs': [
						'scheduledDateTime'
					]
				},
				'_id': '65646634adb778658c92a393'
			},
			{
				'key': 'batchIdentification',
				'type': 'String',
				'properties': {
					'name': 'Batch Identification',
					'fieldLength': 10,
					'_typeChanged': 'String',
					'dataPath': 'batchIdentification',
					'dataPathSegs': [
						'batchIdentification'
					]
				},
				'_id': '65646634adb778658c92a394'
			},
			{
				'key': 'chargeType',
				'type': 'String',
				'properties': {
					'name': 'Charge Type',
					'fieldLength': 10,
					'_typeChanged': 'String',
					'dataPath': 'chargeType',
					'dataPathSegs': [
						'chargeType'
					]
				},
				'_id': '65646634adb778658c92a395'
			},
			{
				'key': 'createdBy',
				'type': 'String',
				'properties': {
					'name': 'CreatedBy',
					'fieldLength': 10,
					'_typeChanged': 'String',
					'dataPath': 'createdBy',
					'dataPathSegs': [
						'createdBy'
					]
				},
				'_id': '65646634adb778658c92a396'
			},
			{
				'key': 'authorizedBy',
				'type': 'String',
				'properties': {
					'name': 'AuthorizedBy',
					'fieldLength': 10,
					'_typeChanged': 'String',
					'dataPath': 'authorizedBy',
					'dataPathSegs': [
						'authorizedBy'
					]
				},
				'_id': '65646634adb778658c92a397'
			}
		],
		'status': 'Active',
		'enableSearchIndex': false,
		'relatedSchemas': {
			'incoming': [

			],
			'outgoing': [

			],
			'internal': {
				'users': [

				]
			},
			'_id': '652669b3f4ab78fc8aeb6650'
		},
		'workflowHooks': {
			'postHooks': {
				'submit': [

				],
				'discard': [

				],
				'approve': [

				],
				'rework': [

				],
				'reject': [

				]
			}
		},
		'attributeCount': 96,
		'type': null,
		'connectors': {
			'data': {
				'_id': 'CON1004'
			},
			'file': {
				'_id': 'CON1005'
			}
		},
		'wizard': [

		],
		'webHooks': [

		],
		'preHooks': [

		],
		'_metadata': {
			'lastUpdated': '2023-11-30T11:25:15.038+0000',
			'createdAt': '2023-10-11T09:24:03.239+0000',
			'deleted': false,
			'version': {
				'document': 140,
				'_id': '652669b3f4ab78fc8aeb6652'
			},
			'lastUpdatedBy': 'AUTO',
			'_id': '652669b3f4ab78fc8aeb6651'
		},
		'collectionName': 'executions',
		'__v': 46,
		'headers': [

		],
		'role': {
			'roles': [
				{
					'manageRole': true,
					'id': 'P8713961766',
					'name': 'Manage',
					'operations': [
						{
							'method': 'POST'
						},
						{
							'method': 'PUT'
						},
						{
							'method': 'DELETE'
						},
						{
							'method': 'GET'
						}
					],
					'description': 'This role entitles an authorized user to create, update or delete a record'
				},
				{
					'viewRole': true,
					'id': 'P8219664513',
					'name': 'View',
					'operations': [
						{
							'method': 'GET'
						}
					],
					'description': 'This role entitles an authorized user to view the record'
				}
			],
			'fields': {
				'_id': {
					'_t': 'String',
					'_p': {
						'P8713961766': 'R',
						'P8219664513': 'R'
					}
				},
				'initiatingParty': {
					'name': {
						'_t': 'String',
						'_p': {
							'P8713961766': 'R',
							'P8219664513': 'R'
						}
					},
					'id': {
						'_t': 'String',
						'_p': {
							'P8713961766': 'R',
							'P8219664513': 'R'
						}
					}
				},
				'paymentInformation': {
					'endToEndIdentification': {
						'_t': 'String',
						'_p': {
							'P8713961766': 'R',
							'P8219664513': 'R'
						}
					},
					'status': {
						'_t': 'String',
						'_p': {
							'P8713961766': 'R',
							'P8219664513': 'R'
						}
					},
					'subStatus': {
						'_t': 'String',
						'_p': {
							'P8713961766': 'R',
							'P8219664513': 'R'
						}
					},
					'remarks': {
						'_t': 'Array',
						'_p': {
							'P8713961766': 'R',
							'P8219664513': 'R'
						}
					},
					'instructedAmount': {
						'value': {
							'_t': 'Number',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'currency': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'inrAmount': {
							'_t': 'Number',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						}
					},
					'equivalentAmount': {
						'value': {
							'_t': 'Number',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'currency': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'inrAmount': {
							'_t': 'Number',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						}
					},
					'exchangeRateInformation': {
						'exchangeRate': {
							'_t': 'Number',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'dealReference': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						}
					},
					'executionDate': {
						'_t': 'String',
						'_p': {
							'P8713961766': 'R',
							'P8219664513': 'R'
						}
					},
					'method': {
						'_t': 'String',
						'_p': {
							'P8713961766': 'R',
							'P8219664513': 'R'
						}
					},
					'debtor': {
						'name': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'id': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'customerId': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'account': {
							'id': {
								'_t': 'String',
								'_p': {
									'P8713961766': 'R',
									'P8219664513': 'R'
								}
							},
							'bic': {
								'_t': 'String',
								'_p': {
									'P8713961766': 'R',
									'P8219664513': 'R'
								}
							}
						}
					},
					'remittanceInfo': {
						'purpose': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'additionalInfo': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'taxReportInfo': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'purposeCode': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'purposeDescription': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						}
					},
					'charges': {
						'_t': 'Array',
						'_p': {
							'P8713961766': 'R',
							'P8219664513': 'R'
						}
					},
					'details': {
						'reference': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'relatedInfo': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'ultimateDebtor': {
							'name': {
								'_t': 'String',
								'_p': {
									'P8713961766': 'R',
									'P8219664513': 'R'
								}
							},
							'id': {
								'_t': 'String',
								'_p': {
									'P8713961766': 'R',
									'P8219664513': 'R'
								}
							},
							'address': {
								'line': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'postalCode': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'town': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'country': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								}
							},
							'pan': {
								'_t': 'String',
								'_p': {
									'P8713961766': 'R',
									'P8219664513': 'R'
								}
							},
							'type': {
								'_t': 'String',
								'_p': {
									'P8713961766': 'R',
									'P8219664513': 'R'
								}
							},
							'fuzzyMatch': {
								'_t': 'String',
								'_p': {
									'P8713961766': 'R',
									'P8219664513': 'R'
								}
							},
							'nsdlName': {
								'_t': 'String',
								'_p': {
									'P8713961766': 'R',
									'P8219664513': 'R'
								}
							},
							'crmName': {
								'_t': 'String',
								'_p': {
									'P8713961766': 'R',
									'P8219664513': 'R'
								}
							},
							'crmCustomerType': {
								'_t': 'String',
								'_p': {
									'P8713961766': 'R',
									'P8219664513': 'R'
								}
							},
							'crmMatch': {
								'_t': 'String',
								'_p': {
									'P8713961766': 'R',
									'P8219664513': 'R'
								}
							}
						},
						'ultimateCreditor': {
							'name': {
								'_t': 'String',
								'_p': {
									'P8713961766': 'R',
									'P8219664513': 'R'
								}
							},
							'id': {
								'_t': 'String',
								'_p': {
									'P8713961766': 'R',
									'P8219664513': 'R'
								}
							},
							'address': {
								'line': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'postalCode': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'town': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'country': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								}
							}
						}
					},
					'instructions': {
						'correspondentBankDetails': {
							'_t': 'Array',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'beneficiaryBank': {
							'name': {
								'_t': 'String',
								'_p': {
									'P8713961766': 'R',
									'P8219664513': 'R'
								}
							},
							'address': {
								'line': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'postalCode': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'town': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'country': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								}
							},
							'swift': {
								'_t': 'String',
								'_p': {
									'P8713961766': 'R',
									'P8219664513': 'R'
								}
							},
							'sortCode': {
								'_t': 'String',
								'_p': {
									'P8713961766': 'R',
									'P8219664513': 'R'
								}
							},
							'account': {
								'_t': 'String',
								'_p': {
									'P8713961766': 'R',
									'P8219664513': 'R'
								}
							}
						},
						'type': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'batch': {
							'_t': 'Boolean',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'fileId': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'clearingSystemRef': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'coreBankingSystemRef': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'lrsRef': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'lrsFlag': {
							'_t': 'Boolean',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'channel': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'debitAdviceType': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						}
					},
					'supplementaryData': {
						'additional': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'nameScreenChecks': {
							'ultimateDebtor': {
								'name': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'matchFound': {
									'_t': 'Boolean',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'reference': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								}
							},
							'ultimateCreditor': {
								'name': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'matchFound': {
									'_t': 'Boolean',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'reference': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								}
							},
							'correspondentBankDetails': {
								'name': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'matchFound': {
									'_t': 'Boolean',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'reference': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								}
							},
							'ultimateCreditorCountry': {
								'name': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'matchFound': {
									'_t': 'Boolean',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'reference': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								}
							},
							'beneficiaryBank': {
								'name': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'matchFound': {
									'_t': 'Boolean',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								},
								'reference': {
									'_t': 'String',
									'_p': {
										'P8713961766': 'R',
										'P8219664513': 'R'
									}
								}
							}
						},
						'workflowReference': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						},
						'nameScreeningMatch': {
							'_t': 'Boolean',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						}
					},
					'trailer': {
						'mac': {
							'_t': 'String',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						}
					},
					'contractReference': {
						'_t': 'String',
						'_p': {
							'P8713961766': 'R',
							'P8219664513': 'R'
						}
					},
					'flags': {
						'batchBooking': {
							'_t': 'Boolean',
							'_p': {
								'P8713961766': 'R',
								'P8219664513': 'R'
							}
						}
					}
				},
				'groupKey': {
					'_t': 'String',
					'_p': {
						'P8713961766': 'R',
						'P8219664513': 'R'
					}
				},
				'paymentId': {
					'_t': 'String',
					'_p': {
						'P8713961766': 'R',
						'P8219664513': 'R'
					}
				},
				'scheduledDateTime': {
					'_t': 'String',
					'_p': {
						'P8713961766': 'R',
						'P8219664513': 'R'
					}
				},
				'batchIdentification': {
					'_t': 'String',
					'_p': {
						'P8713961766': 'R',
						'P8219664513': 'R'
					}
				},
				'chargeType': {
					'_t': 'String',
					'_p': {
						'P8713961766': 'R',
						'P8219664513': 'R'
					}
				},
				'createdBy': {
					'_t': 'String',
					'_p': {
						'P8713961766': 'R',
						'P8219664513': 'R'
					}
				},
				'authorizedBy': {
					'_t': 'String',
					'_p': {
						'P8713961766': 'R',
						'P8219664513': 'R'
					}
				}
			}
		},
		'stateModel': {
			'attribute': '',
			'initialStates': [

			],
			'enabled': false,
			'_id': '65646634adb778658c92a399'
		},
		'workflowConfig': {
			'enabled': false,
			'makerCheckers': [

			],
			'_id': '65646634adb778658c92a39a'
		},
		'draftVersion': null
	}
];

const connectorList = [
	{
		'_id': 'CON1002',
		'app': 'Adam',
		'name': 'MySFTP',
		'category': 'FILE',
		'type': 'SFTP',
		'_metadata': {
			'lastUpdated': '2023-09-05T18:10:30.852+0000',
			'createdAt': '2023-09-05T18:07:54.760+0000',
			'deleted': false,
			'version': {
				'document': 2,
				'_id': '64f76e7afbe9cb7e1ee5aa29'
			},
			'_id': '64f76e7afbe9cb7e1ee5aa28'
		},
		'options': {
			'isValid': true
		},
		'__v': 0,
		'values': {
			'host': '3.7.223.224',
			'port': '22',
			'user': 'sftp_user',
			'authType': 'password',
			'password': '123123123'
		}
	},
	{
		'_id' : 'CON1004',
		'app' : 'Adam',
		'name' : 'MyAzureBlob',
		'category' : 'STORAGE',
		'type' : 'AZBLOB',
		'_metadata' : {
			'lastUpdated' : '2023-11-02T14:27:00.529+0000',
			'createdAt' : '2023-11-02T14:25:48.796+0000',
			'deleted' : false,
			'version' : {
				'document' : 2,
				'_id' : '6543b16c4bebccac712bacc1'
			},
			'_id' : '6543b16c4bebccac712bacc0'
		},
		'options' : {
			'isValid' : true
		},
		'__v' : 0,
		'values' : {
			'connectionString' : 'DefaultEndpointsProtocol=https;AccountName=jugnuagrawal;AccountKey=lrLh18kFvZjYov3sULX7OgvKEQ0rwriOp2usZT9x+50AoO/ztdrmAZk5Aawa5GvZfaitDwdhLB5l+AStfSpuMQ==;EndpointSuffix=core.windows.net',
			'container' : 'my-test-one',
			'sharedKey' : 'dsadsad'
		}
	}
];
async function getApp() {
	return {
		'_id': 'Adam',
		'type': 'Management',
		'description': 'Sample Management app.',
		'agentIPWhitelisting': {
			'list': [

			],
			'enabled': false
		},
		'defaultTimezone': 'Zulu',
		'disableInsights': false,
		'_metadata': {
			'lastUpdated': '2023-12-14T12:50:19.399+0000',
			'createdAt': '2023-05-24T04:54:00.265+0000',
			'deleted': false,
			'version': {
				'document': 8,
				'release': '2.7.0'
			},
		},
		'connectors': {
			'data': {
				'_id': 'CON1000'
			},
			'file': {
				'_id': 'CON1001'
			}
		},
		'encryptionKey': '7dc499fe087063aa6a1df82a5af82359:5df48ed339e86719c9faea02e0e526fc0fe86b9be6e432ce184ebcf5b2165993',
		'__v': 6,
		'appCenterStyle': {
			'theme': 'Light',
			'bannerColor': true,
			'primaryColor': '#44a8f1',
			'textColor': '#FFFFFF'
		},
		'b2bBaseImage': 'dsadad',
		'faasBaseImage': 'dsadad',
		'maskingPaths': [
			{
				'maskType': 'some',
				'dataPath': '[\'pan\']',
				'chars': 3
			}
		],
		'interactionStore': {
			'retainPolicy': {
				'retainType': 'days',
				'retainValue': 10
			},
			'storeType': 'azureblob',
			'configuration': {
				'connector': {
					'_id': 'CON1004',
					'name': 'MyAzureBlob'
				}
			},
		}
	};
	// try {
	// const options = {};
	// options.url = `${config.baseUrlUSR}/data/app/${config.app}`;
	// options.method = 'GET';
	// options.headers = {};
	// options.headers['Content-Type'] = 'application/json';
	// options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
	// const response = await httpClient.request(options);
	// if (response.statusCode !== 200) {
	// 	throw response.body;
	// }
	// if (_.isArray(response.body)) {
	// 	return response.body[0];
	// } else {
	// 	return response.body;
	// }
	// } catch (err) {
	// 	logger.error(err);
	// 	throw err;
	// }
}

async function getDataService(serviceId) {
	return _.find(dataServiceList, { _id: serviceId });
	// try {
	// 	const options = {};
	// 	options.url = `${config.baseUrlSM}/${config.app}/service/${serviceId}`;
	// 	options.method = 'GET';
	// 	options.headers = {};
	// 	options.headers['Content-Type'] = 'application/json';
	// 	options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
	// 	const response = await httpClient.request(options);
	// 	if (response.statusCode !== 200) {
	// 		throw response.body;
	// 	}
	// 	return response.body;
	// } catch (err) {
	// 	logger.error(err);
	// 	throw err;
	// }
}


async function getFlow(flowId) {
	try {
		const options = {};
		options.url = `${config.baseUrlBM}/${config.app}/flow/${flowId}`;
		options.method = 'GET';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		const response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		return response.body;
	} catch (err) {
		logger.error(err);
		throw err;
	}
}

async function getFaaS(faasId) {
	try {
		const options = {};
		options.url = `${config.baseUrlBM}/${config.app}/faas/${faasId}`;
		options.method = 'GET';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		const response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		return response.body;
	} catch (err) {
		logger.error(err);
		throw err;
	}
}

async function getConnector(connectorId) {
	return _.find(connectorList, { _id: connectorId });
	// try {
	// 	const options = {};
	// 	options.url = `${config.baseUrlUSR}/${config.app}/connector/${connectorId}`;
	// 	options.method = 'GET';
	// 	options.headers = {};
	// 	options.headers['Content-Type'] = 'application/json';
	// 	options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
	// 	const response = await httpClient.request(options);
	// 	if (response.statusCode !== 200) {
	// 		throw response.body;
	// 	}
	// 	return response.body;
	// } catch (err) {
	// 	logger.error(err);
	// 	throw err;
	// }
}

async function getCustomNode(nodeId) {
	try {
		const options = {};
		options.url = `${config.baseUrlBM}/${config.app}/node/${nodeId}`;
		options.method = 'GET';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		const response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		return response.body;
	} catch (err) {
		logger.error(err);
		throw err;
	}
}


async function getAllFormulas() {
	return [];
	// try {
	// 	let options = {};
	// 	options.url = `${config.baseUrlUSR}/${config.app}/formula/count`;
	// 	options.method = 'GET';
	// 	options.headers = {};
	// 	options.headers['Content-Type'] = 'application/json';
	// 	options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
	// 	let response = await httpClient.request(options);
	// 	if (response.statusCode !== 200) {
	// 		throw response.body;
	// 	}
	// 	options = {};
	// 	options.url = `${config.baseUrlUSR}/${config.app}/formula?count=` + response.body;
	// 	options.method = 'GET';
	// 	options.headers = {};
	// 	options.headers['Content-Type'] = 'application/json';
	// 	options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
	// 	response = await httpClient.request(options);
	// 	if (response.statusCode !== 200) {
	// 		throw response.body;
	// 	}
	// 	return response.body;
	// } catch (err) {
	// 	logger.error(err);
	// 	throw err;
	// }
}

async function getAllLibraries() {
	try {
		// const client = await MongoClient.connect(config.mongoAuthorUrl, config.mongoAuthorOptions);
		// const docs = await client.db(config.mongoAuthorOptions.dbName).collection('config.b2b.libraries').find({}).toArray();
		// return docs;
		let options = {};
		options.url = `${config.baseUrlBM}/admin/flow/utils/node-library/count`;
		options.method = 'GET';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		let response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		options = {};
		options.url = `${config.baseUrlBM}/admin/flow/utils/node-library?count=` + response.body;
		options.method = 'GET';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		return response.body;
	} catch (err) {
		logger.error(err);
		throw err;
	}
}


function convertToActualBoolean(value) {
	if (typeof value === 'string' && ['true', 't', 'TRUE', 'yes'].indexOf(value) > -1) {
		return true;
	}
	if (typeof value === 'boolean') {
		return value;
	}
	if (typeof value === 'number') {
		return value != 0;
	}
	return false;
}

function convertToCSVBoolean(value) {
	if (typeof value === 'string' && ['true', 't', 'TRUE', 'yes'].indexOf(value) > -1) {
		return 'TRUE';
	}
	if (typeof value === 'boolean') {
		return value ? 'TRUE' : 'FALSE';
	}
	if (typeof value === 'number') {
		return value != 0 ? 'TRUE' : 'FALSE';
	}
	return 'FALSE';
}


function convertDateToISOString(value, format) {
	if (typeof value === 'string') {
		try {
			return moment(value, format, false).toISOString();
		} catch (err) {
			logger.error('unable to parse Date with format:', format);
			logger.error(err);
			return value;
		}
	}
	return value;
}

function parseDate(value, format) {
	if (typeof value === 'string') {
		try {
			return moment(value, format, false).toISOString();
		} catch (err) {
			logger.error('unable to parse date with format:', format);
			logger.error(err);
			return value;
		}
	}
	return value;
}

function renderDate(value, format) {
	if (typeof value === 'string') {
		try {
			return moment(value).format(format);
		} catch (err) {
			logger.error('unable to render date with format:', format);
			logger.error(err);
			return value;
		}
	}
	return value;
}


function writeDataToCSV(filepath, data, headers) {
	return new Promise((resolve, reject) => {
		writeToPath(filepath, data, { headers }).on('error', err => {
			logger.error(err);
			reject(err);
		})
			.on('finish', resolve);
	});
}

function writeDataToXLS(filepath, data, headers) {
	return new Promise((resolve, reject) => {
		writeToPath(filepath, data, { headers }).on('error', err => {
			logger.error(err);
			reject(err);
		})
			.on('finish', resolve);
	});
}

function handleError(err, state, req, _node) {
	// state.error = err;
	if (err.statusCode) {
		state.statusCode = err.statusCode;
	} else {
		state.statusCode = 500;
	}
	if (err.status) {
		state.status = err.status;
	} else {
		state.status = 'ERROR';
	}
	if (err.body) {
		state.responseBody = err.body;
		logger.error(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}]`, err.body);
	} else if (err.message) {
		state.responseBody = { message: err.message };
		logger.error(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}]`, err.message);
	} else {
		state.responseBody = err;
		logger.error(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}]`, err);
	}
	state.error = state.responseBody;
	state.status = 'ERROR';
}

function handleResponse(response, state, _req, _node) {
	logger.trace('Handle Response - ', JSON.stringify(response, null, 4));
	if (!response.statusCode) {
		response.statusCode = 200;
	}
	state.statusCode = response.statusCode;
	state.responseBody = response.body;
	state.headers = response.headers;
	if (response && response.statusCode != 200) {
		state.status = 'ERROR';
		state.statusCode = response && response.statusCode ? response.statusCode : 400;
		state.responseBody = response && response.body ? response.body : { message: 'Unable to reach the URL' };
	} else {
		state.status = 'SUCCESS';
		state.statusCode = 200;
	}
}

function handleValidation(errors, state, _req, _node) {
	if (errors && !_.isEmpty(errors)) {
		state.status = 'ERROR';
		state.statusCode = 400;
		state.responseBody = { message: errors };
	}
}

async function uploadFileToDB(req, uploadFilePath, targetAgentId, targetAgentName, flowName, deploymentName, outputFileName) {
	try {
		const appcenterCon = mongoose.createConnection(config.mongoUrl, config.mongoAppCenterOptions);
		appcenterCon.on('connecting', () => { logger.info(' *** Appcenter DB CONNECTING *** '); });
		appcenterCon.on('disconnected', () => { logger.error(' *** Appcenter DB LOST CONNECTION *** '); });
		appcenterCon.on('reconnect', () => { logger.info(' *** Appcenter DB RECONNECTED *** '); });
		appcenterCon.on('connected', () => { logger.info('Connected to Appcenter DB DB'); global.appcenterCon = appcenterCon; });
		appcenterCon.on('reconnectFailed', () => { logger.error(' *** Appcenter DB FAILED TO RECONNECT *** '); });

		const dbname = config.DATA_STACK_NAMESPACE + '-' + config.app;
		const dataDB = appcenterCon.useDb(dbname);
		const gfsBucket = new mongoose.mongo.GridFSBucket(dataDB, { bucketName: 'b2b.files' });

		const encryptedOutputFileName = 'ENC_' + outputFileName;
		logger.info(`Uploading file ${encryptedOutputFileName} from flow ${config.flowId} to DB`);

		const fileData = fs.readFileSync(uploadFilePath);
		const encryptedData = encryptDataGCM(fileData, config.encryptionKey);

		const downloadFilePath = path.join(process.cwd(), 'downloads', encryptedOutputFileName);
		fs.writeFileSync(downloadFilePath, encryptedData);

		const fileDetails = await new Promise((resolve, reject) => {
			fs.createReadStream(downloadFilePath).
				pipe(gfsBucket.openUploadStream(crypto.createHash('md5').update(uuid()).digest('hex'))).
				on('error', function (error) {
					logger.error(`Error uploading file - ${error}`);
					reject(error);
				}).
				on('finish', function (file) {
					logger.debug('Successfully uploaded file to DB');
					logger.trace(`File details - ${JSON.stringify(file)}`);
					resolve(file);
				});
		});

		logger.info('Requesting BM to update the agent download action');
		const options = {};
		options.url = `${config.baseUrlBM}/${config.app}/agent/utils/${targetAgentId}/agentAction`;
		options.method = 'POST';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		options.headers['Action'] = 'download';

		const metaDataInfo = {};
		metaDataInfo.originalFileName = outputFileName;
		metaDataInfo.remoteTxnID = req.header('data-stack-remote-txn-id');
		metaDataInfo.dataStackTxnID = req.header('data-stack-txn-id');
		metaDataInfo.fileID = fileDetails.filename;
		metaDataInfo.totalChunks = '1';
		metaDataInfo.downloadAgentID = targetAgentId;

		const eventDetails = {
			'agentId': targetAgentId,
			'app': config.app,
			'agentName': targetAgentName,
			'flowName': flowName,
			'flowId': config.flowId,
			'deploymentName': deploymentName,
			'timestamp': new Date(),
			'sentOrRead': false
		};

		const payload = {
			'metaDataInfo': metaDataInfo,
			'eventDetails': eventDetails
		};

		options.json = payload;
		const response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		return fileDetails;
	} catch (err) {
		logger.error(err);
		throw err;
	}
}

function createHash(key) {
	const encodedString = crypto.createHash('md5').update(key).digest('hex');
	return encodedString;
}

function compress(data) {
	const deflated = zlib.deflateSync(data);
	return deflated;
}

function encryptDataGCM(data, key) {
	const compressedData = compress(data);
	const hashedkey = createHash(key);
	const nonce = crypto.randomBytes(12);
	var cipher = crypto.createCipheriv(ALGORITHM, hashedkey, nonce);
	const encrypted = Buffer.concat([nonce, cipher.update(Buffer.from(compressedData).toString('base64')), cipher.final(), cipher.getAuthTag()]);
	return encrypted.toString('base64');
}

function maskStringData(strVal, maskType, charsToShow) {
	if (!strVal) {
		return '';
	}
	if (typeof strVal != 'string') {
		return strVal;
	}
	if (!charsToShow) {
		charsToShow = 5;
	}
	if (maskType == 'all') {
		return strVal.split('').fill('*').join('');
	} else {
		let segs = strVal.split('');
		let segs1 = segs.splice(0, segs.length - charsToShow);
		return segs1.fill('*').join('') + segs.join('');
	}
}

function parseMustacheVariable(value) {
	if (value) {
		return value.replace(/([a-z]+)\[/g, '$1.').replace(/([0-9]+)\]/g, '$1');
	}
}

function getUniqueID() {
	return Date.now() + '_' + crypto.randomInt(1000);
}


module.exports.getApp = getApp;
module.exports.getDataService = getDataService;
module.exports.getFlow = getFlow;
module.exports.getFaaS = getFaaS;
module.exports.getConnector = getConnector;
module.exports.getAllFormulas = getAllFormulas;
module.exports.getCustomNode = getCustomNode;
module.exports.getAllLibraries = getAllLibraries;
module.exports.convertToActualBoolean = convertToActualBoolean;
module.exports.convertToCSVBoolean = convertToCSVBoolean;
module.exports.convertDateToISOString = convertDateToISOString;
module.exports.parseDate = parseDate;
module.exports.renderDate = renderDate;
module.exports.handleError = handleError;
module.exports.handleResponse = handleResponse;
module.exports.handleValidation = handleValidation;
module.exports.writeDataToCSV = writeDataToCSV;
module.exports.writeDataToXLS = writeDataToXLS;
module.exports.uploadFileToDB = uploadFileToDB;
module.exports.maskStringData = maskStringData;
module.exports.parseMustacheVariable = parseMustacheVariable;
module.exports.getUniqueID = getUniqueID;