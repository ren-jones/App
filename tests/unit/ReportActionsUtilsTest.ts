import type {KeyValueMapping} from 'react-native-onyx';
import Onyx from 'react-native-onyx';
import CONST from '../../src/CONST';
import * as ReportActionsUtils from '../../src/libs/ReportActionsUtils';
import ONYXKEYS from '../../src/ONYXKEYS';
import type {Report, ReportAction} from '../../src/types/onyx';
import * as LHNTestUtils from '../utils/LHNTestUtils';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';
import wrapOnyxWithWaitForBatchedUpdates from '../utils/wrapOnyxWithWaitForBatchedUpdates';

describe('ReportActionsUtils', () => {
    beforeAll(() =>
        Onyx.init({
            keys: ONYXKEYS,
            safeEvictionKeys: [ONYXKEYS.COLLECTION.REPORT_ACTIONS],
        }),
    );

    beforeEach(() => {
        // Wrap Onyx each onyx action with waitForBatchedUpdates
        wrapOnyxWithWaitForBatchedUpdates(Onyx);
        // Initialize the network key for OfflineWithFeedback
        return Onyx.merge(ONYXKEYS.NETWORK, {isOffline: false});
    });

    // Clear out Onyx after each test so that each test starts with a clean slate
    afterEach(() => {
        Onyx.clear();
    });

    describe('getSortedReportActions', () => {
        const cases = [
            [
                [
                    // This is the highest created timestamp, so should appear last
                    {
                        created: '2022-11-09 22:27:01.825',
                        reportActionID: '8401445780099176',
                        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                        originalMessage: {
                            html: 'Hello world',
                            whisperedTo: [],
                        },
                    },
                    {
                        created: '2022-11-09 22:27:01.600',
                        reportActionID: '6401435781022176',
                        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                        originalMessage: {
                            html: 'Hello world',
                            whisperedTo: [],
                        },
                    },

                    // These reportActions were created in the same millisecond so should appear ordered by reportActionID
                    {
                        created: '2022-11-09 22:26:48.789',
                        reportActionID: '2962390724708756',
                        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                        originalMessage: {
                            html: 'Hello world',
                            whisperedTo: [],
                        },
                    },
                    {
                        created: '2022-11-09 22:26:48.789',
                        reportActionID: '1609646094152486',
                        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                        originalMessage: {
                            html: 'Hello world',
                            whisperedTo: [],
                        },
                    },
                    {
                        created: '2022-11-09 22:26:48.789',
                        reportActionID: '1661970171066218',
                        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                        originalMessage: {
                            html: 'Hello world',
                            whisperedTo: [],
                        },
                    },
                ],
                [
                    {
                        created: '2022-11-09 22:26:48.789',
                        reportActionID: '1609646094152486',
                        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                        originalMessage: {
                            html: 'Hello world',
                            whisperedTo: [],
                        },
                    },
                    {
                        created: '2022-11-09 22:26:48.789',
                        reportActionID: '1661970171066218',
                        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                        originalMessage: {
                            html: 'Hello world',
                            whisperedTo: [],
                        },
                    },
                    {
                        created: '2022-11-09 22:26:48.789',
                        reportActionID: '2962390724708756',
                        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                        originalMessage: {
                            html: 'Hello world',
                            whisperedTo: [],
                        },
                    },
                    {
                        created: '2022-11-09 22:27:01.600',
                        reportActionID: '6401435781022176',
                        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                        originalMessage: {
                            html: 'Hello world',
                            whisperedTo: [],
                        },
                    },
                    {
                        created: '2022-11-09 22:27:01.825',
                        reportActionID: '8401445780099176',
                        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                        originalMessage: {
                            html: 'Hello world',
                            whisperedTo: [],
                        },
                    },
                ],
            ],
            [
                [
                    // Given three reportActions with the same timestamp
                    {
                        created: '2023-01-10 22:25:47.132',
                        reportActionID: '3',
                        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                        originalMessage: {
                            html: 'Hello world',
                            whisperedTo: [],
                        },
                    },
                    {
                        created: '2023-01-10 22:25:47.132',
                        reportActionID: '2',
                        actionName: CONST.REPORT.ACTIONS.TYPE.CREATED,
                        originalMessage: {
                            html: 'Hello world',
                            whisperedTo: [],
                        },
                    },
                    {
                        created: '2023-01-10 22:25:47.132',
                        reportActionID: '1',
                        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                        originalMessage: {
                            html: 'Hello world',
                            whisperedTo: [],
                        },
                    },
                ],
                [
                    // The CREATED action should appear first, then we should sort by reportActionID
                    {
                        created: '2023-01-10 22:25:47.132',
                        reportActionID: '2',
                        actionName: CONST.REPORT.ACTIONS.TYPE.CREATED,
                        originalMessage: {
                            html: 'Hello world',
                            whisperedTo: [],
                        },
                    },
                    {
                        created: '2023-01-10 22:25:47.132',
                        reportActionID: '1',
                        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                        originalMessage: {
                            html: 'Hello world',
                            whisperedTo: [],
                        },
                    },
                    {
                        created: '2023-01-10 22:25:47.132',
                        reportActionID: '3',
                        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                        originalMessage: {
                            html: 'Hello world',
                            whisperedTo: [],
                        },
                    },
                ],
            ],
        ];

        test.each(cases)('sorts by created, then actionName, then reportActionID', (input, expectedOutput) => {
            const result = ReportActionsUtils.getSortedReportActions(input);
            expect(result).toStrictEqual(expectedOutput);
        });

        test.each(cases)('in descending order', (input, expectedOutput) => {
            const result = ReportActionsUtils.getSortedReportActions(input, true);
            expect(result).toStrictEqual(expectedOutput.reverse());
        });
    });

    describe('getSortedReportActionsForDisplay', () => {
        it('should filter out non-whitelisted actions', () => {
            const input: ReportAction[] = [
                {
                    created: '2022-11-13 22:27:01.825',
                    reportActionID: '8401445780099176',
                    actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                    originalMessage: {
                        html: 'Hello world',
                        whisperedTo: [],
                    },
                    message: [
                        {
                            html: 'Hello world',
                            type: 'Action type',
                            text: 'Action text',
                        },
                    ],
                },
                {
                    created: '2022-11-12 22:27:01.825',
                    reportActionID: '6401435781022176',
                    actionName: CONST.REPORT.ACTIONS.TYPE.CREATED,
                    originalMessage: {
                        html: 'Hello world',
                        whisperedTo: [],
                    },
                    message: [
                        {
                            html: 'Hello world',
                            type: 'Action type',
                            text: 'Action text',
                        },
                    ],
                },
                {
                    created: '2022-11-11 22:27:01.825',
                    reportActionID: '2962390724708756',
                    actionName: CONST.REPORT.ACTIONS.TYPE.IOU,
                    originalMessage: {
                        amount: 0,
                        currency: 'USD',
                        type: 'split', // change to const
                    },
                    message: [
                        {
                            html: 'Hello world',
                            type: 'Action type',
                            text: 'Action text',
                        },
                    ],
                },
                {
                    created: '2022-11-10 22:27:01.825',
                    reportActionID: '1609646094152486',
                    actionName: CONST.REPORT.ACTIONS.TYPE.RENAMED,
                    originalMessage: {
                        html: 'Hello world',
                        lastModified: '2022-11-10 22:27:01.825',
                        oldName: 'old name',
                        newName: 'new name',
                    },
                    message: [
                        {
                            html: 'Hello world',
                            type: 'Action type',
                            text: 'Action text',
                        },
                    ],
                },
                {
                    created: '2022-11-09 22:27:01.825',
                    reportActionID: '8049485084562457',
                    actionName: CONST.REPORT.ACTIONS.TYPE.POLICY_CHANGE_LOG.UPDATE_FIELD,
                    originalMessage: {},
                    message: [{html: 'updated the Approval Mode from "Submit and Approve" to "Submit and Close"', type: 'Action type', text: 'Action text'}],
                },
                {
                    created: '2022-11-08 22:27:06.825',
                    reportActionID: '1661970171066216',
                    actionName: CONST.REPORT.ACTIONS.TYPE.REIMBURSEMENT_QUEUED,
                    originalMessage: {
                        paymentType: 'ACH',
                    },
                    message: [{html: 'Waiting for the bank account', type: 'Action type', text: 'Action text'}],
                },
                {
                    created: '2022-11-06 22:27:08.825',
                    reportActionID: '1661970171066220',
                    actionName: CONST.REPORT.ACTIONS.TYPE.TASK_EDITED,
                    originalMessage: {
                        html: 'Hello world',
                        whisperedTo: [],
                    },
                    message: [{html: 'I have changed the task', type: 'Action type', text: 'Action text'}],
                },
            ];

            // Expected output should have the `CREATED` action at last
            // eslint-disable-next-line rulesdir/prefer-at
            const expectedOutput: ReportAction[] = [...input.slice(0, 1), ...input.slice(2), input[1]];

            const result = ReportActionsUtils.getSortedReportActionsForDisplay(input, true);
            expect(result).toStrictEqual(expectedOutput);
        });

        it('should filter out closed actions', () => {
            const input: ReportAction[] = [
                {
                    created: '2022-11-13 22:27:01.825',
                    reportActionID: '8401445780099176',
                    actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                    originalMessage: {
                        html: 'Hello world',
                        whisperedTo: [],
                    },
                    message: [
                        {
                            html: 'Hello world',
                            type: 'Action type',
                            text: 'Action text',
                        },
                    ],
                },
                {
                    created: '2022-11-12 22:27:01.825',
                    reportActionID: '6401435781022176',
                    actionName: CONST.REPORT.ACTIONS.TYPE.CREATED,
                    originalMessage: {
                        html: 'Hello world',
                        whisperedTo: [],
                    },
                    message: [
                        {
                            html: 'Hello world',
                            type: 'Action type',
                            text: 'Action text',
                        },
                    ],
                },
                {
                    created: '2022-11-11 22:27:01.825',
                    reportActionID: '2962390724708756',
                    actionName: CONST.REPORT.ACTIONS.TYPE.IOU,
                    originalMessage: {
                        amount: 0,
                        currency: 'USD',
                        type: 'split', // change to const
                    },
                    message: [
                        {
                            html: 'Hello world',
                            type: 'Action type',
                            text: 'Action text',
                        },
                    ],
                },
                {
                    created: '2022-11-10 22:27:01.825',
                    reportActionID: '1609646094152486',
                    actionName: CONST.REPORT.ACTIONS.TYPE.RENAMED,
                    originalMessage: {
                        html: 'Hello world',
                        lastModified: '2022-11-10 22:27:01.825',
                        oldName: 'old name',
                        newName: 'new name',
                    },
                    message: [
                        {
                            html: 'Hello world',
                            type: 'Action type',
                            text: 'Action text',
                        },
                    ],
                },
                {
                    created: '2022-11-09 22:27:01.825',
                    reportActionID: '1661970171066218',
                    actionName: CONST.REPORT.ACTIONS.TYPE.CLOSED,
                    originalMessage: {
                        policyName: 'default', // change to const
                        reason: 'default', // change to const
                    },
                    message: [
                        {
                            html: 'Hello world',
                            type: 'Action type',
                            text: 'Action text',
                        },
                    ],
                },
            ];

            // Expected output should have the `CREATED` action at last and `CLOSED` action removed
            // eslint-disable-next-line rulesdir/prefer-at
            const expectedOutput: ReportAction[] = [...input.slice(0, 1), ...input.slice(2, -1), input[1]];

            const result = ReportActionsUtils.getSortedReportActionsForDisplay(input, true);
            expect(result).toStrictEqual(expectedOutput);
        });

        it('should filter out deleted, non-pending comments', () => {
            const input: ReportAction[] = [
                {
                    created: '2022-11-13 22:27:01.825',
                    reportActionID: '8401445780099176',
                    actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                    originalMessage: {
                        html: 'Hello world',
                        whisperedTo: [],
                    },
                    message: [
                        {
                            html: 'Hello world',
                            type: 'Action type',
                            text: 'Action text',
                        },
                    ],
                },
                {
                    created: '2022-11-12 22:27:01.825',
                    reportActionID: '8401445780099175',
                    actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                    originalMessage: {
                        html: 'Hello world',
                        whisperedTo: [],
                    },
                    message: [{html: '', type: 'Action type', text: 'Action text'}],
                    pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE,
                },
                {
                    created: '2022-11-11 22:27:01.825',
                    reportActionID: '8401445780099174',
                    actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                    originalMessage: {
                        html: 'Hello world',
                        whisperedTo: [],
                    },
                    message: [{html: '', type: 'Action type', text: 'Action text'}],
                },
            ];
            const result = ReportActionsUtils.getSortedReportActionsForDisplay(input, true);
            input.pop();
            expect(result).toStrictEqual(input);
        });

        it('should filter actionable whisper actions e.g. "join", "create room" when room is archived', () => {
            const input: ReportAction[] = [
                {
                    created: '2024-11-19 07:59:27.352',
                    reportActionID: '2143762315092102133',
                    actionName: CONST.REPORT.ACTIONS.TYPE.CREATED,
                    message: [
                        {
                            type: 'TEXT',
                            style: 'strong',
                            text: 'You',
                        },
                        {
                            type: 'TEXT',
                            style: 'normal',
                            text: ' created this report',
                        },
                    ],
                },
                {
                    created: '2024-11-19 08:04:13.728',
                    reportActionID: '1607371725956675966',
                    actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                    originalMessage: {
                        html: '<mention-user accountID="18414674"/>',
                        whisperedTo: [],
                        lastModified: '2024-11-19 08:04:13.728',
                        mentionedAccountIDs: [18301266],
                    },
                    message: [
                        {
                            html: '<mention-user accountID="18414674"/>',
                            text: '@as',
                            type: 'COMMENT',
                            whisperedTo: [],
                        },
                    ],
                },
                {
                    created: '2024-11-19 08:00:14.352',
                    reportActionID: '4655978522337302598',
                    actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                    originalMessage: {
                        html: '#join',
                        whisperedTo: [],
                        lastModified: '2024-11-19 08:00:14.352',
                    },
                    message: [
                        {
                            html: '#join',
                            text: '#join',
                            type: 'COMMENT',
                            whisperedTo: [],
                        },
                    ],
                },
                {
                    created: '2022-11-09 22:27:01.825',
                    reportActionID: '8049485084562457',
                    actionName: CONST.REPORT.ACTIONS.TYPE.ACTIONABLE_REPORT_MENTION_WHISPER,
                    originalMessage: {
                        lastModified: '2024-11-19 08:00:14.353',
                        mentionedAccountIDs: [],
                        whisperedTo: [18301266],
                    },
                    message: {
                        html: "Heads up, <mention-report>#join</mention-report> doesn't exist yet. Do you want to create it?",
                        text: "Heads up, #join doesn't exist yet. Do you want to create it?",
                        type: 'COMMENT',
                        whisperedTo: [18301266],
                    },
                },

                {
                    created: '2022-11-12 22:27:01.825',
                    reportActionID: '6401435781022176',
                    actionName: CONST.REPORT.ACTIONS.TYPE.ACTIONABLE_MENTION_WHISPER,
                    originalMessage: {
                        inviteeAccountIDs: [18414674],
                        lastModified: '2024-11-19 08:04:25.813',
                        whisperedTo: [18301266],
                    },
                    message: [
                        {
                            html: "Heads up, <mention-user accountID=18414674></mention-user> isn't a member of this room.",
                            text: "Heads up,  isn't a member of this room.",
                            type: 'COMMENT',
                        },
                    ],
                },
                {
                    created: '2024-11-19 08:13:30.653',
                    reportActionID: '2700998753002050048',
                    actionName: CONST.REPORT.ACTIONS.TYPE.CLOSED,
                    originalMessage: {
                        lastModified: '2024-11-19 08:13:30.653',
                        policyName: "As's Workspace 65",
                        reason: 'policyDeleted',
                    },
                    message: [
                        {
                            type: 'TEXT',
                            style: 'strong',
                            text: 'You',
                        },
                        {
                            type: 'TEXT',
                            style: 'normal',
                            text: ' closed this report',
                        },
                    ],
                },
            ];

            const result = ReportActionsUtils.getSortedReportActionsForDisplay(input, false);
            // Expected output should filter out actionable whisper actions type e.g. "join", "create room"
            // because "canUserPerformWriteAction" is false (report is archived)
            // eslint-disable-next-line rulesdir/prefer-at
            const expectedOutput: ReportAction[] = [...input.slice(1, 3), input[0]];

            expect(result).toStrictEqual(expectedOutput);
        });
    });

    describe('getLastVisibleAction', () => {
        it('should return the last visible action for a report', () => {
            const report: Report = {
                ...LHNTestUtils.getFakeReport([8401445480599174, 9401445480599174], 3, true),
                reportID: '1',
            };
            const action: ReportAction = {
                ...LHNTestUtils.getFakeReportAction('email1@test.com', 3),
                created: '2023-08-01 16:00:00',
                reportActionID: 'action1',
                actionName: 'ADDCOMMENT',
                originalMessage: {
                    html: 'Hello world',
                    whisperedTo: [],
                },
            };
            const action2: ReportAction = {
                ...LHNTestUtils.getFakeReportAction('email2@test.com', 3),
                created: '2023-08-01 18:00:00',
                reportActionID: 'action2',
                actionName: 'ADDCOMMENT',
                originalMessage: {
                    html: 'Hello world',
                    whisperedTo: [],
                },
            };
            return (
                waitForBatchedUpdates()
                    // When Onyx is updated with the data and the sidebar re-renders
                    .then(() =>
                        Onyx.multiSet({
                            [`${ONYXKEYS.COLLECTION.REPORT}${report.reportID}`]: report,
                            [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${report.reportID}`]: {[action.reportActionID]: action, [action2.reportActionID]: action2},
                        } as unknown as KeyValueMapping),
                    )
                    .then(
                        () =>
                            new Promise<void>((resolve) => {
                                const connection = Onyx.connect({
                                    key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${report.reportID}`,
                                    callback: () => {
                                        Onyx.disconnect(connection);
                                        const res = ReportActionsUtils.getLastVisibleAction(report.reportID);
                                        expect(res).toEqual(action2);
                                        resolve();
                                    },
                                });
                            }),
                    )
            );
        });
    });
});
