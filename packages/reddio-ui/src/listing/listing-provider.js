import React from "react";
import immer from "immer";
import { View, Text } from "react-native";
import { Query } from "react-apollo";
import gql from "graphql-tag";
import uniqBy from "lodash/uniqBy";
import isEmpty from "lodash/isEmpty";

import Loading from "../lib/loading";

const LISTING_QUERY = gql`
  query ListingQuery($pathname: String!, $after: String) {
    listing(pathname: $pathname) {
      paginatedPosts(after: $after) {
        posts {
          author
          name
          numComments
          score
          thumbnail
          title
          url
        }
        pageInfo {
          hasNextPage
          nextCursor
        }
      }
    }
  }
`;

function ListingLoading() {
  return (
    <View>
      <Loading />
    </View>
  );
}

function ListingError() {
  return (
    <View>
      <Text>:(</Text>
    </View>
  );
}

function combineQueries(data, moreData) {
  return immer(data, draft => {
    let posts = data.listing.paginatedPosts.posts.concat(
      moreData.listing.paginatedPosts.posts
    );
    posts = uniqBy(posts, p => p.name);

    draft.listing.paginatedPosts.posts = posts;
    draft.listing.paginatedPosts.pageInfo =
      moreData.listing.paginatedPosts.pageInfo;
  });
}

class ListingProvider extends React.Component {
  render() {
    const { pathname } = this.props;
    const variables = { pathname };
    return (
      <Query
        query={LISTING_QUERY}
        variables={variables}
        notifyOnNetworkStatusChange
      >
        {({ networkStatus, loading, error, fetchMore, data }) => {
          if (isEmpty(data) && loading) {
            return <ListingLoading />;
          }

          if (isEmpty(data) && error) {
            return <ListingError />;
          }

          // Check if refetch was called
          // https://github.com/apollographql/apollo-client/blob/master/packages/apollo-client/src/core/networkStatus.ts
          const fetchMoreStatus = 3;
          const refetchStatus = 4;
          const isRefetching =
            networkStatus === fetchMoreStatus ||
            networkStatus === refetchStatus;

          const paginatedPosts = data.listing.paginatedPosts || {};
          const { posts, pageInfo } = paginatedPosts;

          return this.props.children({
            posts,
            pageInfo,
            loading,
            error,
            isRefetching,
            loadNextPage: () => {
              fetchMore({
                variables: {
                  ...variables,
                  after: pageInfo && pageInfo.nextCursor
                },
                updateQuery: (prev, { fetchMoreResult }) =>
                  combineQueries(prev, fetchMoreResult)
              });
            }
          });
        }}
      </Query>
    );
  }
}

export default ListingProvider;
