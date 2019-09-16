import { call, put, takeLatest, select } from 'redux-saga/effects';
import { api, broadcast, auth } from '@steemit/steem-js';
import { PrivateKey } from '@steemit/steem-js/lib/auth/ecc';
import * as communityActions from './CommunityReducer';
import * as transactionActions from './TransactionReducer';
import { wait } from './MarketSaga';

const activeKeySelector = state => {
    return state.user.getIn(['pub_keys_used']).active;
};

const generateAuth = (user, pass, type) => {
    const key = auth.getPrivateKeys(user, pass, [type]);
    const publicKey = auth.wifToPublic(Object.values(key)[0]);
    if (type == 'memo') return publicKey;
    return {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [[publicKey, 1]],
    };
};

const generateHivemindOperation = (action, params, actor_name) => {
    return [
        'custom_json',
        {
            required_auths: [],
            required_posting_auths: [actor_name],
            id: 'community',
            json: JSON.stringify([action, params]),
        },
    ];
};

export const communityWatches = [
    takeLatest(
        communityActions.CREATE_COMMUNITY_ACCOUNT,
        createCommunityAccount
    ),
    takeLatest(communityActions.COMMUNITY_HIVEMIND_OPERATION, customOps),
];

export function* customOps(action) {
    yield put({
        type: communityActions.CREATE_COMMUNITY_ACCOUNT_PENDING,
        payload: true,
    });
    const {
        accountName,
        communityTitle,
        communityDescription,
        communityNSFW,
        communityOwnerName,
        communityOwnerWifPassword,
        createAccountSuccessCB,
        createAccountErrorCB,
        broadcastOpsErrorCB,
    } = action.payload;
    debugger;
    yield call(wait, 9000);
    try {
        const communityOwnerPosting = auth.getPrivateKeys(
            communityOwnerName,
            communityOwnerWifPassword,
            ['posting']
        );

        const setRoleOperation = generateHivemindOperation(
            'setRole',
            {
                community: communityOwnerName,
                account: accountName,
                role: 'admin',
            },
            communityOwnerName,
            communityOwnerPosting
        );

        const updatePropsOperation = generateHivemindOperation(
            'updateProps',
            {
                community: communityOwnerName,
                props: {
                    title: communityTitle,
                    description: communityDescription,
                    is_nsfw: !!communityNSFW,
                },
            },
            communityOwnerName,
            communityOwnerPosting
        );

        yield broadcast.sendAsync(
            {
                extensions: [],
                operations: [setRoleOperation, updatePropsOperation],
            },
            [
                auth.toWif(
                    communityOwnerName,
                    communityOwnerWifPassword,
                    'posting'
                ),
            ]
        );

        yield put({
            type: communityActions.CREATE_COMMUNITY_SUCCESS,
            payload: true,
        });
    } catch (error) {
        console.log(error);
        broadcastOpsErrorCB();
        yield put({
            type: communityActions.CREATE_COMMUNITY_ACCOUNT_ERROR,
            payload: true,
        });
    }
    yield put({
        type: communityActions.CREATE_COMMUNITY_ACCOUNT_PENDING,
        payload: false,
    });
}

export function* createCommunityAccount(createCommunityAction) {
    yield put({
        type: communityActions.CREATE_COMMUNITY_ACCOUNT_PENDING,
        payload: true,
    });
    const {
        accountName,
        communityTitle,
        communityDescription,
        communityNSFW,
        communityOwnerName,
        communityOwnerWifPassword,
        broadcastOpsCb,
        createAccountSuccessCB,
        createAccountErrorCB,
        broadcastOpsErrorCB,
    } = createCommunityAction.payload;
    debugger;

    const communityOwnerPosting = auth.getPrivateKeys(
        communityOwnerName,
        communityOwnerWifPassword,
        ['posting']
    );
    try {
        const op = {
            fee: '3.000 STEEM',
            creator: accountName,
            new_account_name: communityOwnerName,
            owner: generateAuth(
                communityOwnerName,
                communityOwnerWifPassword,
                'owner'
            ),
            active: generateAuth(
                communityOwnerName,
                communityOwnerWifPassword,
                'active'
            ),
            posting: generateAuth(
                communityOwnerName,
                communityOwnerWifPassword,
                'posting'
            ),
            memo_key: generateAuth(
                communityOwnerPosting,
                communityOwnerWifPassword,
                'memo'
            ),
            json_metadata: '',
        };

        debugger;

        yield put(
            transactionActions.broadcastOperation({
                type: 'account_create',
                confirm: 'Are you sure?',
                operation: op,
                successCallback: res => {
                    createAccountSuccessCB();
                    broadcastOpsCb();
                },
                errorCallback: res => {
                    console.log('error', res);
                    createAccountErrorCB();
                },
            })
        );
    } catch (error) {
        console.log(error);
        yield put({
            type: communityActions.CREATE_COMMUNITY_ACCOUNT_ERROR,
            payload: true,
        });
        yield put({
            type: communityActions.CREATE_COMMUNITY_ACCOUNT_PENDING,
            payload: false,
        });
    }
}
