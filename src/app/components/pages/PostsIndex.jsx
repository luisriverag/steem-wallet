/* eslint react/prop-types: 0 */
import React from 'react';
import { connect } from 'react-redux';

class PostsIndex extends React.Component {
    render() {
        return <div />;
    }
}

module.exports = {
    path: ':order(/:category)',
    component: connect(
        (state, ownProps) => {
            return {};
        },
        dispatch => {
            return {};
        }
    )(PostsIndex),
};
