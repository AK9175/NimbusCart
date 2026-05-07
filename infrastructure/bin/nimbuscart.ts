#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NimbusCartStack } from '../lib/nimbuscart-stack';

const app = new cdk.App();

new NimbusCartStack(app, 'NimbusCartStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-west-2',
  },
  description: 'NimbusCart — Cloud-Native Retail and Enterprise Data Portal',
});
